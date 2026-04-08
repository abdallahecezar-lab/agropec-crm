import { NextRequest, NextResponse } from 'next/server'
import { getUserFromRequest } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { startOfMonth, endOfMonth, differenceInMinutes } from 'date-fns'
import { calcularComissao } from '@/lib/utils'

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request)
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const vendedorId = user.role === 'gestor'
      ? new URL(request.url).searchParams.get('vendedorId') || user.id
      : user.id

    const inicioMes = startOfMonth(new Date())
    const fimMes = endOfMonth(new Date())

    // Leads stats
    const [allLeads, leadsConvertidosMes, clientes, checklistItems] = await Promise.all([
      prisma.lead.findMany({
        where: { vendedorId },
        include: {
          followups: { orderBy: { registradoEm: 'desc' }, take: 1 },
          _count: { select: { followups: true, checklistItems: true } },
        },
      }),
      prisma.lead.findMany({
        where: {
          vendedorId,
          statusLead: 'convertido',
          atualizadoEm: { gte: inicioMes, lte: fimMes },
        },
        select: { valorLiquido: true, valorBruto: true },
      }),
      prisma.cliente.findMany({
        where: { vendedorId },
        include: {
          contatos: {
            where: { dataContato: { gte: inicioMes, lte: fimMes } },
          },
        },
      }),
      prisma.scriptChecklistItem.findMany({
        where: { lead: { vendedorId } },
      }),
    ])

    const totalLeads = allLeads.length
    const leadsAtivos = allLeads.filter((l) => l.statusLead === 'ativo').length
    const leadsConvertidos = allLeads.filter((l) => l.statusLead === 'convertido').length
    const leadsDesqualificados = allLeads.filter((l) => l.statusLead === 'desqualificado').length
    const leadsGeladeira = allLeads.filter((l) => l.statusLead === 'geladeira').length

    // Leads para atender: ativos sem 1ª resposta
    const leadsParaAtender = allLeads.filter(
      (l) => l.statusLead === 'ativo' && !(l as any).primeiraRespostaEm
    ).length

    // Follow-ups atrasados: ativos com 1ª resposta, sem followup hoje e último followup há 2+ dias
    const followupsAtrasados = allLeads.filter((l) => {
      if (l.statusLead !== 'ativo' || !(l as any).primeiraRespostaEm) return false
      if (l.followups.length === 0) return false
      const last = new Date(l.followups[0].registradoEm)
      const diffDias = Math.floor((hoje.getTime() - last.getTime()) / 86400000)
      return diffDias >= 2
    }).length

    const porEtapa = allLeads.reduce((acc, l) => {
      acc[l.etapa] = (acc[l.etapa] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    const taxaConversao = totalLeads > 0 ? (leadsConvertidos / totalLeads) * 100 : 0

    // Tempo médio de resposta
    const leadsComResposta = allLeads.filter((l) => (l as any).primeiraRespostaEm)
    const tempoMedioResposta = leadsComResposta.length > 0
      ? leadsComResposta.reduce((sum, l: any) => {
          return sum + differenceInMinutes(new Date(l.primeiraRespostaEm), new Date(l.chegouEm))
        }, 0) / leadsComResposta.length
      : 0

    // Faturamento mes
    const faturamentoMes = leadsConvertidosMes.reduce((sum, l) => sum + (l.valorLiquido || 0), 0)
    const faturamentoBrutoMes = leadsConvertidosMes.reduce((sum, l) => sum + (l.valorBruto || 0), 0)

    // Comissão
    const comissao = calcularComissao(faturamentoMes)

    // Clientes sem contato no mês
    const clientesSemContatoMes = clientes.filter((c) => c.contatos.length === 0).length

    // Leads Chamar Depois atrasados
    const hoje = new Date()
    const leadsChamarDepoisAtrasados = allLeads.filter(
      (l) => l.etapa === 'chamar_depois' && (l as any).agendadoPara && new Date((l as any).agendadoPara) < hoje
    )

    // Checklist conformidade
    const totalPossivel = allLeads.filter((l) => l.statusLead === 'ativo').length * 8
    const totalConcluido = checklistItems.filter((i) => i.concluido).length
    const checklistConformidade = totalPossivel > 0 ? (totalConcluido / totalPossivel) * 100 : 0

    // Reativações hoje
    const reativacoesHoje = allLeads.filter(
      (l) => l.statusLead === 'geladeira' && (l as any).proximaReativacao && new Date((l as any).proximaReativacao) <= hoje
    )

    // Follow-up hoje
    const followupHoje = allLeads.filter((l) => {
      if (l.followups.length === 0) return false
      const lastFu = l.followups[0]
      const d = new Date(lastFu.registradoEm)
      return d.toDateString() === hoje.toDateString()
    }).length

    return NextResponse.json({
      leads: {
        total: totalLeads,
        ativos: leadsAtivos,
        convertidos: leadsConvertidos,
        desqualificados: leadsDesqualificados,
        geladeira: leadsGeladeira,
        porEtapa,
        paraAtender: leadsParaAtender,
      },
      conversao: taxaConversao,
      tempoMedioResposta: Math.round(tempoMedioResposta),
      followupHoje,
      followupsAtrasados,
      clientesSemContatoMes,
      comissao,
      faturamentoMes,
      faturamentoBrutoMes,
      leadsChamarDepoisAtrasados: leadsChamarDepoisAtrasados.slice(0, 5),
      checklistConformidade: Math.round(checklistConformidade),
      reativacoesHoje: reativacoesHoje.slice(0, 5),
    })
  } catch (error) {
    console.error('GET /api/dashboard/vendedor error:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
