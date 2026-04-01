import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { addDays } from 'date-fns'

const moveEtapaSchema = z.object({
  etapa: z.enum(['fez_contato', 'proposta_enviada', 'negociacao', 'chamar_depois', 'correios', 'comprou', 'voltou', 'desqualificado', 'geladeira']),
  agendadoPara: z.string().datetime().optional().nullable(),
  motivoDesqualificacao: z.string().optional().nullable(),
  motivoDesqualificacaoOutro: z.string().optional().nullable(),
  valorBruto: z.number().optional().nullable(),
  valorLiquido: z.number().optional().nullable(),
  observacaoVenda: z.string().optional().nullable(),
  formaPagamento: z.enum(['pix', 'cartao', 'retirada']).optional().nullable(),
  observacao: z.string().optional().nullable(),
  etapaRetorno: z.enum(['proposta_enviada', 'negociacao']).optional(),
})

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: { followups: true },
    })

    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

    if (user.role === 'vendedor' && lead.vendedorId !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const result = moveEtapaSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 })
    }

    const { etapa, agendadoPara, motivoDesqualificacao, motivoDesqualificacaoOutro, valorBruto, valorLiquido, observacaoVenda, formaPagamento, observacao, etapaRetorno } = result.data

    // Validations
    if (etapa === 'chamar_depois' && !agendadoPara) {
      return NextResponse.json({ error: 'Data/hora obrigatória para "Chamar Depois"' }, { status: 400 })
    }

    if (etapa === 'desqualificado' && !motivoDesqualificacao) {
      return NextResponse.json({ error: 'Motivo obrigatório para desqualificação' }, { status: 400 })
    }

    if (etapa === 'desqualificado' && motivoDesqualificacao === 'nunca_respondeu_8_tentativas') {
      if (lead.followups.length < 8) {
        return NextResponse.json({
          error: 'Motivo "nunca respondeu após 8+ tentativas" requer pelo menos 8 follow-ups'
        }, { status: 400 })
      }
    }

    const updateData: any = {
      etapa,
      atualizadoEm: new Date(),
    }

    if (etapa === 'chamar_depois') {
      updateData.agendadoPara = new Date(agendadoPara!)
      updateData.atrasado = false
    }

    if (etapa === 'desqualificado') {
      updateData.statusLead = 'desqualificado'
      updateData.motivoDesqualificacao = motivoDesqualificacao
      updateData.motivoDesqualificacaoOutro = motivoDesqualificacaoOutro || null
    }

    if (etapa === 'geladeira') {
      updateData.statusLead = 'geladeira'
      updateData.entadaGeladeira = new Date()
      updateData.proximaReativacao = addDays(new Date(), 7)
      updateData.tentativasReativacao = 0
    }

    // Venda: correios (pagamento na retirada) ou comprou (pix/cartão)
    if (etapa === 'correios') {
      // Venda registrada mas aguardando retirada — conta para a meta do mês
      if (valorBruto) updateData.valorBruto = valorBruto
      if (valorLiquido) updateData.valorLiquido = valorLiquido
      if (observacaoVenda) updateData.observacaoVenda = observacaoVenda
      if (formaPagamento) updateData.formaPagamento = formaPagamento
      updateData.comprouEm = new Date()
      // statusLead permanece ativo (aguardando retirada)
    }

    if (etapa === 'comprou') {
      updateData.statusLead = 'convertido'
      if (valorBruto) updateData.valorBruto = valorBruto
      if (valorLiquido) updateData.valorLiquido = valorLiquido
      if (observacaoVenda) updateData.observacaoVenda = observacaoVenda
      if (formaPagamento) updateData.formaPagamento = formaPagamento

      // Se veio de correios (confirmou retirada), usa dados já salvos
      const valorLiquidoFinal = valorLiquido ?? lead.valorLiquido ?? 0
      const valorBrutoFinal = valorBruto ?? lead.valorBruto ?? 0

      // Marca a data de compra se não tiver (pix/cartão direto)
      if (!lead.comprouEm) {
        updateData.comprouEm = new Date()
      }

      // Create or update client in carteira
      const existingCliente = await prisma.cliente.findFirst({
        where: { whatsapp: lead.whatsapp },
      })

      if (existingCliente) {
        await prisma.cliente.update({
          where: { id: existingCliente.id },
          data: {
            nome: lead.nomeCliente,
            dataUltimaCompra: new Date(),
            totalCompras: { increment: 1 },
            valorTotalAcumulado: { increment: valorLiquidoFinal },
            ultimoProdutoId: lead.produtoId || undefined,
          },
        })
        updateData.clienteId = existingCliente.id
      } else {
        const novoCliente = await prisma.cliente.create({
          data: {
            nome: lead.nomeCliente,
            whatsapp: lead.whatsapp,
            vendedorId: lead.vendedorId,
            ultimoProdutoId: lead.produtoId || undefined,
            dataPrimeiraCompra: new Date(),
            dataUltimaCompra: new Date(),
            totalCompras: 1,
            valorTotalAcumulado: valorLiquidoFinal,
          },
        })
        updateData.clienteId = novoCliente.id
      }
    }

    if (etapa === 'voltou') {
      // Produto voltou dos correios — desconta da meta do mês atual
      updateData.voltouEm = new Date()
      // statusLead volta para ativo (lead pode ser retrabalahdo)
      updateData.statusLead = 'ativo'
    }

    // If returning from geladeira
    if (lead.statusLead === 'geladeira' && (etapa === 'proposta_enviada' || etapa === 'negociacao')) {
      updateData.statusLead = 'ativo'
      updateData.entadaGeladeira = null
      updateData.proximaReativacao = null
    }

    const updatedLead = await prisma.lead.update({
      where: { id: params.id },
      data: updateData,
    })

    // Stage history
    await prisma.leadEtapaHistorico.create({
      data: {
        leadId: lead.id,
        etapaAnterior: lead.etapa,
        etapaNova: etapa,
        observacao: observacao || null,
      },
    })

    return NextResponse.json({ lead: updatedLead })
  } catch (error) {
    console.error('PATCH /api/leads/[id]/etapa error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
