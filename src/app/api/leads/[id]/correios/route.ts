import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// Calcula prazo de 3 dias úteis a partir de hoje
function calcularPrazoUteis(dias: number): Date {
  const data = new Date()
  let contados = 0
  while (contados < dias) {
    data.setDate(data.getDate() + 1)
    const dow = data.getDay()
    if (dow !== 0 && dow !== 6) contados++ // pula sab/dom
  }
  return data
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const lead = await prisma.lead.findUnique({ where: { id: params.id } })
    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

    if (user.role === 'vendedor' && lead.vendedorId !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { codigoRastreio, statusCorreios } = body

    const updateData: any = {}

    // Ao inserir código de rastreio pela primeira vez
    if (codigoRastreio !== undefined) {
      updateData.codigoRastreio = codigoRastreio
      if (codigoRastreio && !lead.codigoRastreio) {
        updateData.statusCorreios = 'postado'
        updateData.postedAt = new Date()
      }
    }

    // Atualizar status manualmente
    if (statusCorreios !== undefined) {
      updateData.statusCorreios = statusCorreios

      // Produto retirado → mover para Comprou
      if (statusCorreios === 'retirado') {
        updateData.etapa = 'comprou'
        updateData.statusLead = 'convertido'
        updateData.comprouEm = lead.comprouEm || new Date()
      }

      // Produto devolvido → mover para Voltou
      if (statusCorreios === 'devolvido') {
        updateData.etapa = 'voltou'
        updateData.voltouEm = new Date()
      }
    }

    const updated = await prisma.lead.update({
      where: { id: params.id },
      data: updateData,
    })

    // Registrar histórico de etapa se mudou
    if (updateData.etapa) {
      await prisma.leadEtapaHistorico.create({
        data: {
          leadId: params.id,
          etapaAnterior: lead.etapa,
          etapaNova: updateData.etapa,
          observacao: statusCorreios === 'retirado' ? 'Produto retirado nos Correios' : 'Produto devolvido pelos Correios',
        },
      })
    }

    return NextResponse.json({ lead: updated })
  } catch (error) {
    console.error('PATCH /api/leads/[id]/correios error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
