import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const notificacao = await prisma.notificacao.findUnique({ where: { id: params.id } })
    if (!notificacao || notificacao.userId !== user.id) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    await prisma.notificacao.update({
      where: { id: params.id },
      data: { lida: true },
    })

    return NextResponse.json({ message: 'Marcada como lida' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
