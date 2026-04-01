import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const lead = await prisma.lead.findUnique({ where: { id: params.id } })
    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

    if (user.role === 'vendedor' && lead.vendedorId !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    if (lead.primeiraRespostaEm) {
      return NextResponse.json({ error: 'Primeira resposta já registrada' }, { status: 400 })
    }

    const updated = await prisma.lead.update({
      where: { id: params.id },
      data: { primeiraRespostaEm: new Date() },
    })

    const tempoResposta = Math.round(
      (new Date().getTime() - new Date(lead.chegouEm).getTime()) / (1000 * 60)
    )

    return NextResponse.json({ lead: updated, tempoRespostaMinutos: tempoResposta })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
