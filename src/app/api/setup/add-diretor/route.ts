import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'

const SETUP_SECRET = 'agropec-setup-2024'

const DIRETORES = [
  { nome: 'Luis Cezar', email: 'luis.alecezar@gmail.com' },
  { nome: 'Flávia', email: 'flavia.agropecbrasil@gmail.com' },
]

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')

    if (secret !== SETUP_SECRET) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    const senhaHash = await hash('Agropec2024', 10)
    const resultados = []

    for (const diretor of DIRETORES) {
      const existing = await prisma.user.findUnique({ where: { email: diretor.email } })

      if (existing) {
        const updated = await prisma.user.update({
          where: { email: diretor.email },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          data: { role: 'diretor' as any, nome: diretor.nome },
          select: { id: true, nome: true, email: true, role: true },
        })
        resultados.push({ acao: 'atualizado', user: updated })
      } else {
        const novo = await prisma.user.create({
          data: {
            nome: diretor.nome,
            email: diretor.email,
            senha: senhaHash,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            role: 'diretor' as any,
            gestorId: null,
          },
          select: { id: true, nome: true, email: true, role: true },
        })
        resultados.push({ acao: 'criado', user: novo })
      }
    }

    return NextResponse.json({ message: 'Diretores configurados com sucesso', resultados }, { status: 201 })
  } catch (error) {
    console.error('GET /api/setup/add-diretor error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
