import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const templateSchema = z.object({
  nome: z.string().min(1),
  categoria: z.string().min(1),
  conteudo: z.string().min(1),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const categoria = searchParams.get('categoria')

    const templates = await prisma.templateMensagem.findMany({
      where: {
        ativo: true,
        ...(categoria ? { categoria } : {}),
      },
      orderBy: { categoria: 'asc' },
    })

    return NextResponse.json({ templates })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (user.role !== 'gestor') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const body = await request.json()
    const result = templateSchema.safeParse(body)
    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 })
    }

    const template = await prisma.templateMensagem.create({ data: result.data })
    return NextResponse.json({ template }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (user.role !== 'gestor') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const body = await request.json()
    const { id, ...data } = body

    const template = await prisma.templateMensagem.update({
      where: { id },
      data,
    })

    return NextResponse.json({ template })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
