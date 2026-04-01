import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (user.role !== 'gestor') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const vendedores = await prisma.user.findMany({
      where: { role: 'vendedor', ativo: true },
      select: { id: true, nome: true },
    })

    const vendedoresStats = await Promise.all(
      vendedores.map(async (v) => {
        const leads = await prisma.lead.findMany({
          where: { vendedorId: v.id },
          include: { checklistItems: true },
        })

        const totalLeads = leads.length
        const leadsComChecklist = leads.filter((l) => l.checklistItems.length > 0).length

        // Per-lead checklist completion
        const leadsChecklistCompleto = leads.filter((l) => {
          const concluidos = l.checklistItems.filter((ci) => ci.concluido).length
          return concluidos === 8
        }).length

        const totalConcluido = leads
          .flatMap((l) => l.checklistItems)
          .filter((ci) => ci.concluido).length

        const totalPossivel = totalLeads * 8
        const mediaConformidade = totalPossivel > 0
          ? Math.round((totalConcluido / totalPossivel) * 100)
          : 0

        const passosMedios = totalLeads > 0
          ? totalConcluido / totalLeads
          : 0

        // Distribution per step (% of leads that completed each step)
        const distribuicaoPorPasso: Record<number, number> = {}
        for (let i = 1; i <= 8; i++) {
          const concluidos = leads.filter((l) =>
            l.checklistItems.some((ci) => ci.item === i && ci.concluido)
          ).length
          distribuicaoPorPasso[i] = totalLeads > 0 ? Math.round((concluidos / totalLeads) * 100) : 0
        }

        return {
          vendedor: v,
          totalLeads,
          mediaConformidade,
          leadsComChecklist,
          leadsChecklistCompleto,
          passosMedios,
          distribuicaoPorPasso,
        }
      })
    )

    const mediaGeral = vendedoresStats.length > 0
      ? Math.round(
          vendedoresStats.reduce((sum, v) => sum + v.mediaConformidade, 0) / vendedoresStats.length
        )
      : 0

    // Incomplete checklists across all active leads
    const leadsIncompletos = await prisma.lead.findMany({
      where: {
        statusLead: 'ativo',
        checklistItems: { some: {} }, // has at least one item
      },
      include: {
        vendedor: { select: { nome: true } },
        checklistItems: true,
      },
      orderBy: { criadoEm: 'desc' },
      take: 50,
    })

    const incompletos = leadsIncompletos
      .map((l) => {
        const concluidos = l.checklistItems.filter((ci) => ci.concluido).length
        return {
          id: l.id,
          nomeCliente: l.nomeCliente,
          vendedor: { nome: l.vendedor?.nome || '—' },
          concluidos,
          total: 8,
          pct: Math.round((concluidos / 8) * 100),
        }
      })
      .filter((l) => l.pct < 100)
      .sort((a, b) => a.pct - b.pct)

    return NextResponse.json({
      vendedores: vendedoresStats,
      mediaGeral,
      leadsIncompletos: incompletos,
    })
  } catch (error) {
    console.error('GET /api/monitor-script error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
