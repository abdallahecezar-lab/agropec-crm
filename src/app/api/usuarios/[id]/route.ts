import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (user.role !== 'gestor') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const body = await request.json()
    const { ativo } = body

    // Make sure the target user belongs to this gestor
    const target = await prisma.user.findUnique({ where: { id: params.id } })
    if (!target || target.gestorId !== user.id) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    const updated = await prisma.user.update({
      where: { id: params.id },
      data: { ativo },
      select: { id: true, nome: true, email: true, role: true, ativo: true, gestorId: true },
    })

    return NextResponse.json({ user: updated })
  } catch (error) {
    console.error('PATCH /api/usuarios/[id] error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
