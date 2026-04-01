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

/**
 * Calcula faturamento líquido do mês considerando:
 * - vendas confirmadas (comprou) com comprouEm no mês
 * - vendas em correios com comprouEm no mês (aguardando retirada)
 * - DESCONTA voltas com voltouEm no mês
 */
async function calcularFaturamentoMes(vendedorId: string | null, inicioMes: Date, fimMes: Date) {
  const whereBase = vendedorId ? { vendedorId } : {}

  // Vendas do mês: leads em comprou ou correios com comprouEm no período
  const vendasMes = await prisma.lead.findMany({
    where: {
      ...whereBase,
      etapa: { in: ['comprou', 'correios', 'voltou'] },
      comprouEm: { gte: inicioMes, lte: fimMes },
    },
    select: { valorBruto: true, valorLiquido: true, etapa: true },
  })

  // Voltas do mês: leads com voltouEm no período (desconto)
  const voltasMes = await prisma.lead.findMany({
    where: {
      ...whereBase,
      etapa: 'voltou',
      voltouEm: { gte: inicioMes, lte: fimMes },
    },
    select: { valorLiquido: true, valorBruto: true },
  })

  const totalBrutoVendas = vendasMes.reduce((s, l) => s + (l.valorBruto || 0), 0)
  const totalLiquidoVendas = vendasMes.reduce((s, l) => s + (l.valorLiquido || 0), 0)
  const totalLiquidoVoltou = voltasMes.reduce((s, l) => s + (l.valorLiquido || 0), 0)
  const totalBrutoVoltou = voltasMes.reduce((s, l) => s + (l.valorBruto || 0), 0)

  // Só contam as vendas que não foram "voltou" já (evitar dupla contagem)
  // leads em 'voltou' que comprouEm está no mês atual e voltouEm também no mês atual
  // já estão em vendasMes (incluídos), então descontamos as voltas deste mês
  const liquido = totalLiquidoVendas - totalLiquidoVoltou
  const bruto = totalBrutoVendas - totalBrutoVoltou

  const qtdVendas = vendasMes.filter(l => l.etapa !== 'voltou').length + voltasMes.length
  // qtd de vendas efetivas = comprou + correios (não voltou)
  const qtdEfetivas = vendasMes.filter(l => l.etapa !== 'voltou').length

  return {
    bruto: Math.max(0, bruto),
    liquido: Math.max(0, liquido),
    qtdVendas: qtdEfetivas,
    totalVoltas: voltasMes.length,
    valorVoltas: totalLiquidoVoltou,
  }
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
          const fat = await calcularFaturamentoMes(v.id, inicioMes, fimMes)
          const comissao = calcularComissao(fat.liquido)
          return {
            vendedor: v,
            faturamentoLiquido: fat.liquido,
            faturamentoBruto: fat.bruto,
            comissao: comissao.comissao,
            percentual: comissao.percentual,
            totalVoltas: fat.totalVoltas,
            valorVoltas: fat.valorVoltas,
          }
        })
      )

      const totaisBruto = rankingData.reduce((s, r) => s + r.faturamentoBruto, 0)
      const totaisLiquido = rankingData.reduce((s, r) => s + r.faturamentoLiquido, 0)
      const totalVendas = rankingData.reduce((s, r) => s + 0, 0) // gestor vê por vendedor

      const comissaoTotal = calcularComissao(totaisLiquido)
      const projecao = diasUteis.decorridos > 0
        ? (totaisLiquido / diasUteis.decorridos) * diasUteis.total
        : 0

      return NextResponse.json({
        mes: format(agora, "MMMM 'de' yyyy", { locale: ptBR }),
        faturamentoBruto: totaisBruto,
        faturamentoLiquido: totaisLiquido,
        vendas: totalVendas,
        ticketMedioBruto: 0,
        ticketMedioLiquido: 0,
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
    const fat = await calcularFaturamentoMes(user.id, inicioMes, fimMes)
    const comissao = calcularComissao(fat.liquido)
    const projecao = diasUteis.decorridos > 0
      ? (fat.liquido / diasUteis.decorridos) * diasUteis.total
      : 0

    return NextResponse.json({
      mes: format(agora, "MMMM 'de' yyyy", { locale: ptBR }),
      faturamentoBruto: fat.bruto,
      faturamentoLiquido: fat.liquido,
      vendas: fat.qtdVendas,
      totalVoltas: fat.totalVoltas,
      valorVoltas: fat.valorVoltas,
      ticketMedioBruto: fat.qtdVendas > 0 ? fat.bruto / fat.qtdVendas : 0,
      ticketMedioLiquido: fat.qtdVendas > 0 ? fat.liquido / fat.qtdVendas : 0,
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
