import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'
import { isSameDay } from '@/lib/utils'

const createFollowupSchema = z.object({
  observacao: z.string().optional(),
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

    const followups = await prisma.followup.findMany({
      where: { leadId: params.id },
      include: { vendedor: { select: { nome: true } } },
      orderBy: { numero: 'asc' },
    })

    return NextResponse.json({ followups })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const lead = await prisma.lead.findUnique({
      where: { id: params.id },
      include: { followups: { orderBy: { registradoEm: 'desc' } } },
    })

    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 })

    if (user.role === 'vendedor' && lead.vendedorId !== user.id) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Check: first contact is not a follow-up (primeiraRespostaEm)
    if (!lead.primeiraRespostaEm) {
      return NextResponse.json({
        error: 'Registre a primeira resposta antes de adicionar follow-ups'
      }, { status: 400 })
    }

    // Check max 1 follow-up per day
    const hoje = new Date()
    const followupHoje = lead.followups.find((f) => isSameDay(f.registradoEm, hoje))

    if (followupHoje) {
      return NextResponse.json({
        error: 'Já existe um follow-up registrado hoje para este lead'
      }, { status: 400 })
    }

    const body = await request.json()
    const result = createFollowupSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json({ error: result.error.errors[0].message }, { status: 400 })
    }

    const numero = lead.followups.length + 1

    const followup = await prisma.followup.create({
      data: {
        leadId: params.id,
        vendedorId: user.id,
        numero,
        observacao: result.data.observacao || null,
      },
      include: { vendedor: { select: { nome: true } } },
    })

    // Check if eligible for geladeira suggestion (8+ followups)
    const totalFollowups = numero
    let sugestao = null
    if (totalFollowups >= 8) {
      sugestao = 'Com 8+ follow-ups sem conversão, considere mover este lead para a Geladeira.'
    } else if (totalFollowups >= 6) {
      sugestao = `${totalFollowups} follow-ups - aproximando do limite. Mais ${8 - totalFollowups} para sugestão de geladeira.`
    }

    return NextResponse.json({ followup, sugestao }, { status: 201 })
  } catch (error) {
    console.error('POST followups error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
