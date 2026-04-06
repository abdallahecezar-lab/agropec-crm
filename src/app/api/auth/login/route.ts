import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/prisma'
import { signToken, setAuthCookie } from '@/lib/auth'
import { z } from 'zod'

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const result = loginSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: result.error.errors[0].message },
        { status: 400 }
      )
    }

    const { email, senha } = result.data

    // Use raw SQL to avoid Prisma enum cache issues with 'diretor' role
    const users = await prisma.$queryRawUnsafe<Array<{
      id: string
      nome: string
      email: string
      senha: string
      role: string
      ativo: boolean
    }>>(
      `SELECT id, nome, email, senha, role::text, ativo FROM "User" WHERE email = $1`,
      email.toLowerCase()
    )

    const user = users[0]

    if (!user || !user.ativo) {
      return NextResponse.json(
        { error: 'Email ou senha inválidos' },
        { status: 401 }
      )
    }

    const senhaValida = await bcrypt.compare(senha, user.senha)

    if (!senhaValida) {
      return NextResponse.json(
        { error: 'Email ou senha inválidos' },
        { status: 401 }
      )
    }

    const token = await signToken({
      id: user.id,
      email: user.email,
      nome: user.nome,
      role: user.role as 'gestor' | 'vendedor' | 'diretor',
    })

    const cookieConfig = setAuthCookie(token)

    const response = NextResponse.json({
      user: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        role: user.role,
      },
    })

    response.cookies.set(cookieConfig.name, cookieConfig.value, cookieConfig.options as any)

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 })
  }
}
