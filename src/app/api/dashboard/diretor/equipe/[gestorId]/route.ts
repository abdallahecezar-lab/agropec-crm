import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, startOfDay, endOfDay } from 'date-fns'

export async function GET(
  request: NextRequest,
  { params }: { params: { gestorId: string } }
) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (user.role !== 'diretor' && user.role !== 'gestor') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }
    // Gestor só pode ver sua própria equipe
    if (user.role === 'gestor' && user.id !== params.gestorId) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const inicio = searchParams.get('inicio')
      ? new Date(searchParams.get('inicio')!)
      : startOfMonth(new Date())
    const fim = searchParams.get('fim')
      ? new Date(searchParams.get('fim')!)
      : endOfMonth(new Date())

    const gestor = await prisma.user.findUnique({
      where: { id: params.gestorId },
      select: { id: true, nome: true, email: true },
    })
    if (!gestor) return NextResponse.json({ error: 'Gestor não encontrado' }, { status: 404 })

    const vendedores = await prisma.user.findMany({
      where: { gestorId: params.gestorId, ativo: true },
      select: { id: true, nome: true, email: true },
      orderBy: { nome: 'asc' },
    })

    const hoje = new Date()

    const vendedorStats = await Promise.all(vendedores.map(async (v) => {
      const [leadsNoPeriodo, todosLeadsAtivos, clientes, followupsAtrasados] = await Promise.all([
        // Leads recebidos no período
        prisma.lead.findMany({
          where: { vendedorId: v.id, chegouEm: { gte: inicio, lte: fim } },
          select: { id: true, etapa: true, statusLead: true, valorLiquido: true },
        }),
        // Todos os leads ativos do vendedor
        prisma.lead.findMany({
          where: { vendedorId: v.id, statusLead: 'ativo' },
          select: {
            id: true,
            etapa: true,
            agendadoPara: true,
            followups: { select: { id: true, registradoEm: true }, orderBy: { registradoEm: 'desc' }, take: 1 },
          },
        }),
        // Clientes carteira
        prisma.cliente.findMany({
          where: { vendedorId: v.id },
          select: { id: true, totalCompras: true, valorTotalAcumulado: true },
        }),
        // Follow-ups atrasados (chamar_depois vencido)
        prisma.lead.count({
          where: {
            vendedorId: v.id,
            etapa: 'chamar_depois',
            statusLead: 'ativo',
            agendadoPara: { lt: hoje },
          },
        }),
      ])

      const convertidos = leadsNoPeriodo.filter((l) => l.statusLead === 'convertido')
      const vendasLeads = convertidos.filter((l) => l.etapa !== 'voltou')
      const vendasCarteira = convertidos.filter((l) => l.etapa === 'voltou')

      const faturamento = convertidos.reduce((s, l) => s + (l.valorLiquido || 0), 0)
      const faturamentoLeads = vendasLeads.reduce((s, l) => s + (l.valorLiquido || 0), 0)
      const faturamentoCarteira = vendasCarteira.reduce((s, l) => s + (l.valorLiquido || 0), 0)

      const taxaConversaoLeads = leadsNoPeriodo.length > 0
        ? Math.round((convertidos.length / leadsNoPeriodo.length) * 1000) / 10 : 0

      const clientesComRecompra = clientes.filter((c) => (c.totalCompras || 0) > 1).length
      const taxaConversaoCarteira = clientes.length > 0
        ? Math.round((clientesComRecompra / clientes.length) * 1000) / 10 : 0

      const ticketMedioLeads = vendasLeads.length > 0
        ? Math.round(faturamentoLeads / vendasLeads.length) : 0
      const ticketMedioCarteira = vendasCarteira.length > 0
        ? Math.round(faturamentoCarteira / vendasCarteira.length) : 0

      const leadsPorEtapa = leadsNoPeriodo.reduce((acc, l) => {
        acc[l.etapa] = (acc[l.etapa] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      // Follow-ups em dia = leads ativos com último follow-up hoje
      const followupsEmDia = todosLeadsAtivos.filter((l) => {
        if (l.followups.length === 0) return false
        const ultimo = new Date(l.followups[0].registradoEm)
        return ultimo >= startOfDay(hoje) && ultimo <= endOfDay(hoje)
      }).length

      return {
        vendedor: { id: v.id, nome: v.nome, email: v.email },
        leadsRecebidos: leadsNoPeriodo.length,
        convertidos: convertidos.length,
        faturamento,
        faturamentoLeads,
        faturamentoCarteira,
        taxaConversaoLeads,
        taxaConversaoCarteira,
        ticketMedioLeads,
        ticketMedioCarteira,
        totalClientes: clientes.length,
        clientesComRecompra,
        leadsPorEtapa,
        followupsEmDia,
        followupsAtrasados,
        desqualificados: leadsNoPeriodo.filter((l) => l.statusLead === 'desqualificado').length,
      }
    }))

    return NextResponse.json({
      gestor,
      periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
      vendedores: vendedorStats,
    })
  } catch (error) {
    console.error('GET /api/dashboard/diretor/equipe/[gestorId] error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
