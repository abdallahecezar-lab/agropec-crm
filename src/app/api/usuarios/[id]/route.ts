import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (user.role === 'vendedor') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const body = await request.json()
    const { ativo, nome, gestorId } = body

    const target = await prisma.user.findUnique({ where: { id: params.id } })
    if (!target) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })

    // Gestor can only manage their own team
    if (user.role === 'gestor' && target.gestorId !== user.id) {
      return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {}
    if (ativo !== undefined) data.ativo = ativo
    if (nome !== undefined) data.nome = nome
    if (gestorId !== undefined) data.gestorId = gestorId

    const updated = await prisma.user.update({
      where: { id: params.id },
      data,
      select: { id: true, nome: true, email: true, role: true, ativo: true, gestorId: true },
    })

    return NextResponse.json({ user: updated })
  } catch (error) {
    console.error('PATCH /api/usuarios/[id] error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
