import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateChecklistSchema = z.object({
  item: z.number().min(1).max(8),
  concluido: z.boolean(),
  objecao: z.enum(['achou_caro', 'gado_pouco', 'nao_conhece_produto', 'sem_interesse', 'sem_registro_mapa', 'outro']).optional().nullable(),
  objecaoOutro: z.string().optional().nullable(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const lead = await prisma.lead.findUnique({ where: { id: params.id } })
    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

    if (user.role === 'vendedor' && lead.vendedorId !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const items = await prisma.scriptChecklistItem.findMany({
      where: { leadId: params.id },
      orderBy: { item: 'asc' },
    })

    return NextResponse.json({ items })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const lead = await prisma.lead.findUnique({ where: { id: params.id } })
    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

    if (user.role === 'vendedor' && lead.vendedorId !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const body = await request.json()
    const result = updateChecklistSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 })
    }

    const { item, concluido, objecao, objecaoOutro } = result.data

    const checklistItem = await prisma.scriptChecklistItem.upsert({
      where: { leadId_item: { leadId: params.id, item } },
      create: {
        leadId: params.id,
        item,
        concluido,
        objecao: objecao as any || null,
        objecaoOutro: objecaoOutro || null,
        concluidoEm: concluido ? new Date() : null,
      },
      update: {
        concluido,
        objecao: objecao as any || null,
        objecaoOutro: objecaoOutro || null,
        concluidoEm: concluido ? new Date() : null,
      },
    })

    return NextResponse.json({ item: checklistItem })
  } catch (error) {
    console.error('PATCH checklist error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
