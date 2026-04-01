import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const notificacoes = await prisma.notificacao.findMany({
      where: { userId: user.id },
      orderBy: { criadoEm: 'desc' },
      take: 20,
    })

    return NextResponse.json({ notificacoes })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()

    if (body.all) {
      await prisma.notificacao.updateMany({
        where: { userId: user.id, lida: false },
        data: { lida: true },
      })
    }

    return NextResponse.json({ message: 'Notificações marcadas como lidas' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
