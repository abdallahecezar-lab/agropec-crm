import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { hash } from 'bcryptjs'

const createUserSchema = z.object({
  nome: z.string().min(2, 'Nome obrigatório'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Senha mínima 6 caracteres'),
  role: z.enum(['gestor', 'vendedor', 'diretor']),
  gestorId: z.string().optional().nullable(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (user.role === 'vendedor') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    // Diretor sees all vendedores; gestor sees only their own team
    const vendedores = await prisma.user.findMany({
      where: user.role !== 'gestor'
        ? { role: 'vendedor', ativo: true }
        : { gestorId: user.id, ativo: true },
      select: { id: true, nome: true, email: true, role: true, ativo: true, criadoEm: true, gestorId: true },
      orderBy: { nome: 'asc' },
    })

    // Also return all gestores (for assignment when creating vendedores)
    const gestores = await prisma.user.findMany({
      where: { role: 'gestor', ativo: true },
      select: { id: true, nome: true, email: true },
      orderBy: { nome: 'asc' },
    })

    return NextResponse.json({ vendedores, gestores })
  } catch (error) {
    console.error('GET /api/usuarios error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (user.role === 'vendedor') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const body = await request.json()
    const result = createUserSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 })
    }

    const { nome, email, senha, role, gestorId } = result.data

    // Check if email already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'E-mail já cadastrado' }, { status: 400 })
    }

    const senhaHash = await hash(senha, 10)

    const novoUser = await prisma.user.create({
      data: {
        nome,
        email,
        senha: senhaHash,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        role: role as any,
        gestorId: role === 'vendedor' ? (gestorId || user.id) : null,
      },
      select: { id: true, nome: true, email: true, role: true, ativo: true, criadoEm: true, gestorId: true },
    })

    return NextResponse.json({ user: novoUser }, { status: 201 })
  } catch (error) {
    console.error('POST /api/usuarios error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
