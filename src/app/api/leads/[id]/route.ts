import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateLeadSchema = z.object({
  nomeCliente: z.string().min(1).optional(),
  whatsapp: z.string().optional(),
  produtoId: z.string().optional(),
  origem: z.enum(['rastreado', 'nao_rastreado']).optional(),
  observacoes: z.string().optional(),
  agendadoPara: z.string().optional().nullable(),
})

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: {
        produto: true,
        vendedor: { select: { id: true, nome: true, email: true, role: true } },
        followups: {
          include: { vendedor: { select: { nome: true } } },
          orderBy: { numero: 'asc' },
        },
        checklistItems: { orderBy: { item: 'asc' } },
        historicoEtapas: { orderBy: { mudadoEm: 'asc' } },
        cliente: true,
      },
    })

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })
    }

    if (user.role === 'vendedor' && lead.vendedorId !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    return NextResponse.json({ lead })
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
    const result = updateLeadSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 })
    }

    const { agendadoPara, ...rest } = result.data
    const updateData: any = { ...rest }
    if (agendadoPara !== undefined) {
      updateData.agendadoPara = agendadoPara ? new Date(agendadoPara) : null
    }

    const updated = await prisma.lead.update({
      where: { id: params.id },
      data: updateData,
      include: {
        produto: true,
        vendedor: { select: { id: true, nome: true } },
      },
    })

    return NextResponse.json({ lead: updated })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (user.role !== 'gestor') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    await prisma.lead.delete({ where: { id: params.id } })

    return NextResponse.json({ message: 'Lead removido' })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
