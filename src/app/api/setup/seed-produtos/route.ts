import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getUserFromRequest } from '@/lib/auth'

const PRODUTOS_CORRETOS = [
  { nome: 'Promotor de Engorda', cicloRecompraDias: 30 },
  { nome: 'Vermífugo', cicloRecompraDias: 30 },
  { nome: 'Vitaminas', cicloRecompraDias: 30 },
  { nome: 'Cavalo', cicloRecompraDias: 30 },
  { nome: 'Todos os Produtos', cicloRecompraDias: 30 },
]

export async function POST(request: NextRequest) {
  const user = await getUserFromRequest(request)
  if (!user || (user.role !== 'gestor' && user.role !== 'diretor')) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })
  }

  // Desvincula leads dos produtos antigos antes de deletar
  await prisma.lead.updateMany({ data: { produtoId: null } })
  await prisma.produto.deleteMany()

  const criados = await Promise.all(
    PRODUTOS_CORRETOS.map((p) => prisma.produto.create({ data: p }))
  )

  return NextResponse.json({ ok: true, produtos: criados })
}
