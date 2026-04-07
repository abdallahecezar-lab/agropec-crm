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
    const origem = searchParams.get('origem')
    const chegouEmInicio = searchParams.get('chegouEmInicio')
    const chegouEmFim = searchParams.get('chegouEmFim')
    const ultimoContatoInicio = searchParams.get('ultimoContatoInicio')
    const ultimoContatoFim = searchParams.get('ultimoContatoFim')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '50')
    const skip = (page - 1) * limit

    const where: any = {}

    if (user.role === 'vendedor') {
      where.vendedorId = user.id
    } else if (user.role === 'gestor') {
      const equipe = await prisma.user.findMany({
        where: { gestorId: user.id, role: 'vendedor' },
        select: { id: true },
      })
      const ids = [...equipe.map((v) => v.id), user.id]
      if (vendedorId && ids.includes(vendedorId)) {
        where.vendedorId = vendedorId
      } else {
        where.vendedorId = { in: ids }
      }
    } else if (user.role === 'diretor' && vendedorId) {
      where.vendedorId = vendedorId
    }

    if (etapa) where.etapa = etapa
    if (statusLead) where.statusLead = statusLead
    if (origem) where.origem = origem

    // Filtro: data de entrada
    if (chegouEmInicio || chegouEmFim) {
      where.chegouEm = {}
      if (chegouEmInicio) where.chegouEm.gte = new Date(chegouEmInicio)
      if (chegouEmFim) {
        const fim = new Date(chegouEmFim)
        fim.setHours(23, 59, 59, 999)
        where.chegouEm.lte = fim
      }
    }

    // Filtro: data do último contato (followup mais recente no período)
    if (ultimoContatoInicio || ultimoContatoFim) {
      const followupWhere: any = {}
      if (ultimoContatoInicio) followupWhere.gte = new Date(ultimoContatoInicio)
      if (ultimoContatoFim) {
        const fim = new Date(ultimoContatoFim)
        fim.setHours(23, 59, 59, 999)
        followupWhere.lte = fim
      }
      where.followups = { some: { criadoEm: followupWhere } }
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        include: {
          produto: { select: { id: true, nome: true, cicloRecompraDias: true } },
          vendedor: { select: { id: true, nome: true, email: true, role: true } },
          followups: { orderBy: { criadoEm: 'desc' }, take: 1, select: { criadoEm: true } },
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
