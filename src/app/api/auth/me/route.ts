import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const tokenUser = await getUserFromRequest(request)

    if (!tokenUser) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Use raw SQL to avoid Prisma enum cache issues with 'diretor' role
    const users = await prisma.$queryRawUnsafe<Array<{
      id: string; nome: string; email: string; role: string; ativo: boolean; criadoEm: Date; atualizadoEm: Date
    }>>(
      `SELECT id, nome, email, role::text, ativo, "criadoEm", "atualizadoEm" FROM "User" WHERE id = $1`,
      tokenUser.id
    )

    const user = users[0]

    if (!user || !user.ativo) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ user })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
