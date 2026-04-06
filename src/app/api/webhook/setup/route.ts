import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

const SETUP_SECRET = 'agropec-setup-2024'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    const action = searchParams.get('action')

    if (secret !== SETUP_SECRET) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    if (action === 'add-diretor') {
      const email = 'luis.alecezar@gmail.com'
      const senhaHash = await hash('Agropec2024', 10)

      const existing = await prisma.user.findUnique({ where: { email } })

      if (existing) {
        const updated = await prisma.user.update({
          where: { email },
          data: { role: 'diretor' },
          select: { id: true, nome: true, email: true, role: true },
        })
        return NextResponse.json({ message: 'Usuário atualizado para diretor', user: updated })
      }

      const novoUser = await prisma.user.create({
        data: {
          nome: 'Luis Cezar',
          email,
          senha: senhaHash,
          role: 'diretor',
          gestorId: null,
        },
        select: { id: true, nome: true, email: true, role: true },
      })

      return NextResponse.json({ message: 'Usuário diretor criado com sucesso', user: novoUser }, { status: 201 })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (error) {
    console.error('GET /api/webhook/setup error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
