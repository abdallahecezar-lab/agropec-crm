import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const cliente = await prisma.cliente.findUnique({
      where: { id: params.id },
      include: {
        ultimoProduto: true,
        contatos: {
          include: { vendedor: { select: { nome: true } } },
          orderBy: { dataContato: 'desc' },
        },
        leads: {
          include: { produto: { select: { nome: true } } },
          orderBy: { criadoEm: 'desc' },
        },
      },
    })

    if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

    if (user.role === 'vendedor' && cliente.vendedorId !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    return NextResponse.json({ cliente })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const cliente = await prisma.cliente.findUnique({ where: { id: params.id } })
    if (!cliente) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

    if (user.role === 'vendedor' && cliente.vendedorId !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const { proximaAcao, statusRelacionamento } = body

    const updated = await prisma.cliente.update({
      where: { id: params.id },
      data: {
        proximaAcao: proximaAcao !== undefined ? proximaAcao : undefined,
        statusRelacionamento: statusRelacionamento !== undefined ? statusRelacionamento : undefined,
      },
    })

    return NextResponse.json({ cliente: updated })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
