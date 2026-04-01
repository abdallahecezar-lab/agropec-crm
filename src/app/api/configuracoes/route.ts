import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const configs = await prisma.configuracaoSistema.findMany({
      orderBy: { chave: 'asc' },
    })

    const configMap = configs.reduce((acc, c) => {
      acc[c.chave] = c.valor
      return acc
    }, {} as Record<string, string>)

    return NextResponse.json({ configs: configMap, lista: configs })
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
    const { configs } = body // { chave: valor }

    await Promise.all(
      Object.entries(configs).map(([chave, valor]) =>
        prisma.configuracaoSistema.upsert({
          where: { chave },
          create: { chave, valor: valor as string },
          update: { valor: valor as string },
        })
      )
    )

    return NextResponse.json({ message: 'Configurações salvas' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
