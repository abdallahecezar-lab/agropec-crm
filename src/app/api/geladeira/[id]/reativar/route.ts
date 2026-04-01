import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { addDays } from 'date-fns'
import { z } from 'zod'

const reativarSchema = z.object({
  resultado: z.string().optional(),
  observacao: z.string().optional(),
  voltouAoFunil: z.boolean().default(false),
  etapaRetorno: z.enum(['proposta_enviada', 'negociacao']).optional(),
})

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const lead = await prisma.lead.findUnique({ where: { id: params.id } })
    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

    if (user.role === 'vendedor' && lead.vendedorId !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    if (lead.statusLead !== 'geladeira') {
      return NextResponse.json({ error: 'Lead não está na geladeira' }, { status: 400 })
    }

    const body = await request.json()
    const result = reativarSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 })
    }

    const { resultado, observacao, voltouAoFunil, etapaRetorno } = result.data

    // Create reativacao record
    await prisma.reativacaoLead.create({
      data: {
        leadId: params.id,
        vendedorId: user.id,
        resultado: resultado || null,
        observacao: observacao || null,
        voltouAoFunil,
        etapaRetorno: etapaRetorno || null,
      },
    })

    // Calculate next reativacao date based on cadence
    const tentativas = lead.tentativasReativacao + 1
    const cadencia = [7, 15, 30]
    const diasProximo = cadencia[tentativas] || 30
    const proximaReativacao = addDays(new Date(), diasProximo)

    let updateData: any = {
      tentativasReativacao: tentativas,
      proximaReativacao,
    }

    if (voltouAoFunil && etapaRetorno) {
      updateData = {
        ...updateData,
        etapa: etapaRetorno,
        statusLead: 'ativo',
        entadaGeladeira: null,
        proximaReativacao: null,
      }
    }

    const updatedLead = await prisma.lead.update({
      where: { id: params.id },
      data: updateData,
    })

    if (voltouAoFunil && etapaRetorno) {
      await prisma.leadEtapaHistorico.create({
        data: {
          leadId: params.id,
          etapaAnterior: 'geladeira',
          etapaNova: etapaRetorno,
          observacao: 'Reativado da geladeira',
        },
      })
    }

    return NextResponse.json({ lead: updatedLead })
  } catch (error) {
    console.error('POST reativar error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
