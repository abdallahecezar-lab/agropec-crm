import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, format, getDaysInMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { calcularComissao } from '@/lib/utils'

function calcularDiasUteis(mes: Date): { total: number; decorridos: number } {
  const hoje = new Date()
  const diasNoMes = getDaysInMonth(mes)
  let total = 0
  let decorridos = 0

  for (let d = 1; d <= diasNoMes; d++) {
    const dia = new Date(mes.getFullYear(), mes.getMonth(), d)
    const dow = dia.getDay()
    if (dow !== 0 && dow !== 6) {
      total++
      if (dia <= hoje) decorridos++
    }
  }
  return { total, decorridos }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const agora = new Date()
    const inicioMes = startOfMonth(agora)
    const fimMes = endOfMonth(agora)
    const diasUteis = calcularDiasUteis(agora)

    // If gestor, compute ranking for all vendors
    if (user.role === 'gestor') {
      const vendedores = await prisma.user.findMany({
        where: { role: 'vendedor', ativo: true },
        select: { id: true, nome: true },
      })

      const rankingData = await Promise.all(
        vendedores.map(async (v) => {
          const vendas = await prisma.lead.aggregate({
            where: {
              vendedorId: v.id,
              statusLead: 'convertido',
              atualizadoEm: { gte: inicioMes, lte: fimMes },
            },
            _sum: { valorLiquido: true, valorBruto: true },
            _count: { id: true },
          })
          const liquido = vendas._sum.valorLiquido || 0
          const comissao = calcularComissao(liquido)
          return {
            vendedor: v,
            faturamentoLiquido: liquido,
            faturamentoBruto: vendas._sum.valorBruto || 0,
            comissao: comissao.comissao,
            percentual: comissao.percentual,
          }
        })
      )

      const totaisBruto = rankingData.reduce((s, r) => s + r.faturamentoBruto, 0)
      const totaisLiquido = rankingData.reduce((s, r) => s + r.faturamentoLiquido, 0)
      const totalVendas = await prisma.lead.count({
        where: {
          statusLead: 'convertido',
          atualizadoEm: { gte: inicioMes, lte: fimMes },
        },
      })

      const comissaoTotal = calcularComissao(totaisLiquido)
      const projecao = diasUteis.decorridos > 0
        ? (totaisLiquido / diasUteis.decorridos) * diasUteis.total
        : 0

      return NextResponse.json({
        mes: format(agora, "MMMM 'de' yyyy", { locale: ptBR }),
        faturamentoBruto: totaisBruto,
        faturamentoLiquido: totaisLiquido,
        vendas: totalVendas,
        ticketMedioBruto: totalVendas > 0 ? totaisBruto / totalVendas : 0,
        ticketMedioLiquido: totalVendas > 0 ? totaisLiquido / totalVendas : 0,
        comissao: comissaoTotal,
        projecao,
        diasUteis,
        salarioFixo: {
          parcela1: { valor: 1000, data: 'Dia 20' },
          parcela2: { valor: 1000, data: '5º dia útil' },
          total: 2000,
        },
        remuneracaoTotal: 2000 + comissaoTotal.comissao,
        rankingGestor: rankingData.sort((a, b) => b.faturamentoLiquido - a.faturamentoLiquido),
      })
    }

    // Vendedor view
    const vendas = await prisma.lead.aggregate({
      where: {
        vendedorId: user.id,
        statusLead: 'convertido',
        atualizadoEm: { gte: inicioMes, lte: fimMes },
      },
      _sum: { valorLiquido: true, valorBruto: true },
      _count: { id: true },
    })

    const bruto = vendas._sum.valorBruto || 0
    const liquido = vendas._sum.valorLiquido || 0
    const qtdVendas = vendas._count.id

    const comissao = calcularComissao(liquido)
    const projecao = diasUteis.decorridos > 0
      ? (liquido / diasUteis.decorridos) * diasUteis.total
      : 0

    return NextResponse.json({
      mes: format(agora, "MMMM 'de' yyyy", { locale: ptBR }),
      faturamentoBruto: bruto,
      faturamentoLiquido: liquido,
      vendas: qtdVendas,
      ticketMedioBruto: qtdVendas > 0 ? bruto / qtdVendas : 0,
      ticketMedioLiquido: qtdVendas > 0 ? liquido / qtdVendas : 0,
      comissao,
      projecao,
      diasUteis,
      salarioFixo: {
        parcela1: { valor: 1000, data: 'Dia 20' },
        parcela2: { valor: 1000, data: '5º dia útil' },
        total: 2000,
      },
      remuneracaoTotal: 2000 + comissao.comissao,
    })
  } catch (error) {
    console.error('GET /api/metas error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
