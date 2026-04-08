import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const transacoes = await prisma.salesTransaction.findMany({
      where: { leadId: params.id },
      orderBy: { criadoEm: 'desc' },
    })

    return NextResponse.json({ transacoes })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const lead = await prisma.lead.findUnique({ where: { id: params.id } })
    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

    if (user.role === 'vendedor' && lead.vendedorId !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { tipo, valorBruto, valorLiquido, descricao } = body

    if (!tipo || valorBruto == null || valorLiquido == null) {
      return NextResponse.json({ error: 'tipo, valorBruto e valorLiquido são obrigatórios' }, { status: 400 })
    }

    const agora = new Date()
    const transacao = await prisma.salesTransaction.create({
      data: {
        leadId: params.id,
        vendedorId: lead.vendedorId,
        tipo,
        valorBruto,
        valorLiquido,
        mes: agora.getMonth() + 1,
        ano: agora.getFullYear(),
        descricao: descricao || null,
      },
    })

    return NextResponse.json({ transacao }, { status: 201 })
  } catch (error) {
    console.error('POST /api/leads/[id]/transacoes error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
