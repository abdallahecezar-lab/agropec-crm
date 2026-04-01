import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const where: any = {
      statusLead: 'geladeira',
      etapa: 'geladeira',
    }

    if (user.role === 'vendedor') {
      where.vendedorId = user.id
    }

    const leads = await prisma.lead.findMany({
      where,
      include: {
        produto: { select: { id: true, nome: true } },
        vendedor: { select: { id: true, nome: true } },
        followups: { orderBy: { numero: 'desc' }, take: 1 },
        reativacoes: { orderBy: { realizadaEm: 'desc' }, take: 3 },
        _count: { select: { followups: true } },
      },
      orderBy: { proximaReativacao: 'asc' },
    })

    const hoje = new Date()
    const leadsComStatus = leads.map((l) => ({
      ...l,
      precisaReativar: l.proximaReativacao ? new Date(l.proximaReativacao) <= hoje : false,
    }))

    return NextResponse.json({ leads: leadsComStatus })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
