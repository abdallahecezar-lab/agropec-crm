import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    if (user.role !== 'diretor' && user.role !== 'gestor') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const inicio = searchParams.get('inicio')
      ? new Date(searchParams.get('inicio')!)
      : startOfMonth(new Date())
    const fim = searchParams.get('fim')
      ? new Date(searchParams.get('fim')!)
      : endOfMonth(new Date())

    // Para gestor: só mostra a própria equipe
    // Para diretor: mostra tudo
    const gestoresWhere = user.role === 'gestor'
      ? { id: user.id }
      : { role: 'gestor' as const, ativo: true }

    const gestores = await prisma.user.findMany({
      where: gestoresWhere,
      select: { id: true, nome: true },
      orderBy: { nome: 'asc' },
    })

    // Busca todos os leads da empresa (ou do gestor) no período
    const leadsWhere: any = {
      chegouEm: { gte: inicio, lte: fim },
    }
    if (user.role === 'gestor') {
      const vendedoresIds = await prisma.user.findMany({
        where: { gestorId: user.id, ativo: true },
        select: { id: true },
      })
      leadsWhere.vendedorId = { in: [...vendedoresIds.map((v) => v.id), user.id] }
    }

    const allLeads = await prisma.lead.findMany({
      where: leadsWhere,
      select: {
        id: true,
        etapa: true,
        statusLead: true,
        valorLiquido: true,
        origem: true,
        chegouEm: true,
        vendedorId: true,
        vendedor: { select: { id: true, gestorId: true } },
      },
    })

    // Busca clientes carteira e suas recompras
    const clientesWhere: any = {}
    if (user.role === 'gestor') {
      const vendedoresIds = await prisma.user.findMany({
        where: { gestorId: user.id, ativo: true },
        select: { id: true },
      })
      clientesWhere.vendedorId = { in: [...vendedoresIds.map((v) => v.id), user.id] }
    }
    const todosClientes = await prisma.cliente.findMany({
      where: clientesWhere,
      select: { id: true, vendedorId: true, totalCompras: true, valorTotalAcumulado: true },
    })

    // Vendas de carteira = leads "voltou" convertidos no período
    const vendasCarteira = allLeads.filter(
      (l) => l.statusLead === 'convertido' && l.etapa === 'voltou'
    )
    // Vendas de novos leads = convertidos que NÃO são voltou
    const vendasLeads = allLeads.filter(
      (l) => l.statusLead === 'convertido' && l.etapa !== 'voltou'
    )

    // Métricas globais
    const totalLeadsRecebidos = allLeads.length
    const totalConvertidos = allLeads.filter((l) => l.statusLead === 'convertido').length
    const taxaConversaoLeads = totalLeadsRecebidos > 0
      ? Math.round((totalConvertidos / totalLeadsRecebidos) * 1000) / 10
      : 0

    const totalClientes = todosClientes.length
    const clientesComRecompra = todosClientes.filter((c) => (c.totalCompras || 0) > 1).length
    const taxaConversaoCarteira = totalClientes > 0
      ? Math.round((clientesComRecompra / totalClientes) * 1000) / 10
      : 0

    const faturamentoLeads = vendasLeads.reduce((s, l) => s + (l.valorLiquido || 0), 0)
    const faturamentoCarteira = vendasCarteira.reduce((s, l) => s + (l.valorLiquido || 0), 0)
    const faturamentoTotal = faturamentoLeads + faturamentoCarteira

    const ticketMedioLeads = vendasLeads.length > 0
      ? Math.round(faturamentoLeads / vendasLeads.length)
      : 0
    const ticketMedioCarteira = vendasCarteira.length > 0
      ? Math.round(faturamentoCarteira / vendasCarteira.length)
      : 0

    const leadsPorEtapa = allLeads.reduce((acc, l) => {
      acc[l.etapa] = (acc[l.etapa] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Métricas por equipe
    const equipes = await Promise.all(gestores.map(async (gestor) => {
      const vendedoresEquipe = await prisma.user.findMany({
        where: { gestorId: gestor.id, ativo: true },
        select: { id: true },
      })
      const idsEquipe = [...vendedoresEquipe.map((v) => v.id), gestor.id]

      const leadsEquipe = allLeads.filter((l) => idsEquipe.includes(l.vendedorId))
      const clientesEquipe = todosClientes.filter((c) => idsEquipe.includes(c.vendedorId))

      const convertidosEquipe = leadsEquipe.filter((l) => l.statusLead === 'convertido')
      const vendasLeadsEquipe = convertidosEquipe.filter((l) => l.etapa !== 'voltou')
      const vendasCarteiraEquipe = convertidosEquipe.filter((l) => l.etapa === 'voltou')

      const fatEquipe = convertidosEquipe.reduce((s, l) => s + (l.valorLiquido || 0), 0)
      const fatLeadsEquipe = vendasLeadsEquipe.reduce((s, l) => s + (l.valorLiquido || 0), 0)
      const fatCarteiraEquipe = vendasCarteiraEquipe.reduce((s, l) => s + (l.valorLiquido || 0), 0)

      const clientesRecompraEquipe = clientesEquipe.filter((c) => (c.totalCompras || 0) > 1).length
      const taxaConvLeadsEquipe = leadsEquipe.length > 0
        ? Math.round((convertidosEquipe.length / leadsEquipe.length) * 1000) / 10 : 0
      const taxaConvCarteiraEquipe = clientesEquipe.length > 0
        ? Math.round((clientesRecompraEquipe / clientesEquipe.length) * 1000) / 10 : 0

      const leadsPorEtapaEquipe = leadsEquipe.reduce((acc, l) => {
        acc[l.etapa] = (acc[l.etapa] || 0) + 1
        return acc
      }, {} as Record<string, number>)

      return {
        gestor: { id: gestor.id, nome: gestor.nome },
        leadsRecebidos: leadsEquipe.length,
        convertidos: convertidosEquipe.length,
        faturamento: fatEquipe,
        faturamentoLeads: fatLeadsEquipe,
        faturamentoCarteira: fatCarteiraEquipe,
        taxaConversaoLeads: taxaConvLeadsEquipe,
        taxaConversaoCarteira: taxaConvCarteiraEquipe,
        ticketMedioLeads: vendasLeadsEquipe.length > 0 ? Math.round(fatLeadsEquipe / vendasLeadsEquipe.length) : 0,
        ticketMedioCarteira: vendasCarteiraEquipe.length > 0 ? Math.round(fatCarteiraEquipe / vendasCarteiraEquipe.length) : 0,
        totalClientes: clientesEquipe.length,
        clientesComRecompra: clientesRecompraEquipe,
        leadsPorEtapa: leadsPorEtapaEquipe,
        vendedoresCount: idsEquipe.length,
      }
    }))

    return NextResponse.json({
      periodo: { inicio: inicio.toISOString(), fim: fim.toISOString() },
      totais: {
        faturamentoTotal,
        faturamentoLeads,
        faturamentoCarteira,
        leadsRecebidos: totalLeadsRecebidos,
        convertidos: totalConvertidos,
        taxaConversaoLeads,
        taxaConversaoCarteira,
        ticketMedioLeads,
        ticketMedioCarteira,
        totalClientes,
        clientesComRecompra,
        leadsPorEtapa,
      },
      equipes,
    })
  } catch (error) {
    console.error('GET /api/dashboard/diretor error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
