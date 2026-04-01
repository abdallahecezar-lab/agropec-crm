import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createLeadSchema = z.object({
  nomeCliente: z.string().min(1, 'Nome obrigatório'),
  whatsapp: z.string().min(8, 'WhatsApp inválido'),
  produtoId: z.string().optional(),
  origem: z.enum(['rastreado', 'nao_rastreado']).default('nao_rastreado'),
  observacoes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const etapa = searchParams.get('etapa')
    const statusLead = searchParams.get('statusLead')
    const vendedorId = searchParams.get('vendedorId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: any = {}

    if (user.role === 'vendedor') {
      where.vendedorId = user.id
    } else if (user.role === 'gestor') {
      // Get IDs of vendedores in this gestor's team
      const equipe = await prisma.user.findMany({
        where: { gestorId: user.id, role: 'vendedor' },
        select: { id: true },
      })
      const ids = equipe.map((v) => v.id)
      if (vendedorId && ids.includes(vendedorId)) {
        where.vendedorId = vendedorId
      } else {
        where.vendedorId = { in: ids }
      }
    }

    if (etapa) where.etapa = etapa
    if (statusLead) where.statusLead = statusLead

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          produto: { select: { id: true, nome: true, cicloRecompraDias: true } },
          vendedor: { select: { id: true, nome: true, email: true, role: true } },
          _count: { select: { followups: true, checklistItems: true } },
        },
        orderBy: { chegouEm: 'desc' },
        skip,
        take: limit,
      }),
      prisma.lead.count({ where }),
    ])

    return NextResponse.json({ leads, total, page, limit })
  } catch (error) {
    console.error('GET /api/leads error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const body = await request.json()
    const result = createLeadSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 })
    }

    const { nomeCliente, whatsapp, produtoId, origem, observacoes } = result.data

    const lead = await prisma.lead.create({
      data: {
        nomeCliente,
        whatsapp,
        produtoId: produtoId || null,
        origem,
        observacoes,
        vendedorId: user.id,
        etapa: 'fez_contato',
        statusLead: 'ativo',
      },
      include: {
        produto: { select: { id: true, nome: true } },
        vendedor: { select: { id: true, nome: true } },
      },
    })

    // Create stage history
    await prisma.leadEtapaHistorico.create({
      data: {
        leadId: lead.id,
        etapaNova: 'fez_contato',
      },
    })

    return NextResponse.json({ lead }, { status: 201 })
  } catch (error) {
    console.error('POST /api/leads error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
