import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, subDays, format } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (user.role !== 'gestor') return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })

    const inicioMes = startOfMonth(new Date())
    const fimMes = endOfMonth(new Date())

    const [vendedores, allLeads, clientes] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'vendedor', ativo: true, gestorId: user.id },
      }),
      prisma.lead.findMany({
        where: { vendedor: { gestorId: user.id } },
        include: {
          checklistItems: true,
          followups: true,
        },
      }),
      prisma.cliente.findMany({
        where: { vendedor: { gestorId: user.id } },
        include: {
          contatos: {
            where: { dataContato: { gte: inicioMes, lte: fimMes } },
          },
        },
      }),
    ])

    const totalLeads = allLeads.length
    const totalConvertidos = allLeads.filter((l) => l.statusLead === 'convertido').length
    const totalFaturamento = allLeads
      .filter((l) => l.statusLead === 'convertido')
      .reduce((sum, l) => sum + (l.valorLiquido || 0), 0)
    const totalClientes = clientes.length
    const hoje = new Date()
    const leadsAtrasados = allLeads.filter(
      (l) => l.etapa === 'chamar_depois' && (l as any).agendadoPara && new Date((l as any).agendadoPara) < hoje
    ).length

    const leadsPorEtapa = allLeads.reduce((acc, l) => {
      acc[l.etapa] = (acc[l.etapa] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Per vendedor stats
    const vendedorStats = vendedores.map((v) => {
      const vLeads = allLeads.filter((l) => l.vendedorId === v.id)
      const vConvertidos = vLeads.filter((l) => l.statusLead === 'convertido')
      const vFaturamento = vConvertidos.reduce((sum, l) => sum + (l.valorLiquido || 0), 0)
      const taxaConversao = vLeads.length > 0 ? (vConvertidos.length / vLeads.length) * 100 : 0

      // Checklist conformidade
      const totalPossivel = vLeads.filter((l) => l.statusLead === 'ativo').length * 8
      const totalConcluido = vLeads.flatMap((l) => l.checklistItems).filter((i) => i.concluido).length
      const checklistConformidade = totalPossivel > 0 ? (totalConcluido / totalPossivel) * 100 : 0

      // Clientes cuidados este mes
      const vClientes = clientes.filter((c) => c.vendedorId === v.id)
      const clientesCuidados = vClientes.filter((c) => c.contatos.length > 0).length

      return {
        vendedor: { id: v.id, nome: v.nome, email: v.email, role: v.role, ativo: v.ativo, criadoEm: v.criadoEm.toISOString(), atualizadoEm: v.atualizadoEm.toISOString() },
        leads: vLeads.length,
        convertidos: vConvertidos.length,
        faturamento: vFaturamento,
        taxaConversao: Math.round(taxaConversao * 10) / 10,
        checklistConformidade: Math.round(checklistConformidade),
        clientesCuidados,
      }
    })

    // Faturamento por dia (last 30 days)
    const faturamentoPorDia = Array.from({ length: 30 }, (_, i) => {
      const dia = subDays(new Date(), 29 - i)
      const diaStr = format(dia, 'dd/MM')
      const valor = allLeads
        .filter((l) => {
          if (l.statusLead !== 'convertido' || !l.valorLiquido) return false
          const updated = new Date(l.atualizadoEm)
          return updated.toDateString() === dia.toDateString()
        })
        .reduce((sum, l) => sum + (l.valorLiquido || 0), 0)
      return { dia: diaStr, valor }
    })

    const rankingFaturamento = vendedorStats
      .sort((a, b) => b.faturamento - a.faturamento)
      .slice(0, 10)

    return NextResponse.json({
      totais: {
        leads: totalLeads,
        convertidos: totalConvertidos,
        faturamento: totalFaturamento,
        clientes: totalClientes,
        leadsAtrasados,
      },
      vendedores: vendedorStats,
      leadsPorEtapa,
      faturamentoPorDia,
      rankingFaturamento,
    })
  } catch (error) {
    console.error('GET /api/dashboard/gestor error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
