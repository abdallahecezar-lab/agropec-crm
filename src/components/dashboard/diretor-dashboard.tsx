'use client'

import { useEffect, useState, useCallback } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import * as XLSX from 'xlsx'
import { StatsCard } from './stats-card'
import { useAuth } from '@/hooks/use-auth'
import { formatCurrency } from '@/lib/utils'
import { ETAPAS_LEAD } from '@/lib/constants'

// ─── Types ───────────────────────────────────────────────────────────────────

interface EtapaMap { [etapa: string]: number }

interface EquipeResumo {
  gestor: { id: string; nome: string }
  leadsRecebidos: number
  convertidos: number
  faturamento: number
  faturamentoLeads: number
  faturamentoCarteira: number
  taxaConversaoLeads: number
  taxaConversaoCarteira: number
  ticketMedioLeads: number
  ticketMedioCarteira: number
  totalClientes: number
  clientesComRecompra: number
  leadsPorEtapa: EtapaMap
  vendedoresCount: number
}

interface DashboardTotais {
  faturamentoTotal: number
  faturamentoLeads: number
  faturamentoCarteira: number
  leadsRecebidos: number
  convertidos: number
  taxaConversaoLeads: number
  taxaConversaoCarteira: number
  ticketMedioLeads: number
  ticketMedioCarteira: number
  totalClientes: number
  clientesComRecompra: number
  leadsPorEtapa: EtapaMap
}

interface VendedorStat {
  vendedor: { id: string; nome: string; email: string }
  leadsRecebidos: number
  convertidos: number
  faturamento: number
  faturamentoLeads: number
  faturamentoCarteira: number
  taxaConversaoLeads: number
  taxaConversaoCarteira: number
  ticketMedioLeads: number
  ticketMedioCarteira: number
  totalClientes: number
  clientesComRecompra: number
  leadsPorEtapa: EtapaMap
  followupsEmDia: number
  followupsAtrasados: number
  desqualificados: number
}

type OrdemVendedor = 'faturamento' | 'taxaConversaoLeads' | 'taxaConversaoCarteira' | 'followupsAtrasados' | 'desqualificados' | 'leadsRecebidos'

// ─── Helpers ─────────────────────────────────────────────────────────────────

function pct(v: number) { return `${v.toFixed(1)}%` }

function EtapaBar({ leadsPorEtapa }: { leadsPorEtapa: EtapaMap }) {
  const total = Object.values(leadsPorEtapa).reduce((s, v) => s + v, 0)
  if (total === 0) return <p className="text-xs text-gray-400">Sem leads no período</p>
  return (
    <div className="space-y-1.5">
      {ETAPAS_LEAD.map((e) => {
        const qtd = leadsPorEtapa[e.id] || 0
        if (qtd === 0) return null
        const pctVal = Math.round((qtd / total) * 100)
        return (
          <div key={e.id} className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-32 truncate">{e.label}</span>
            <div className="flex-1 bg-gray-100 rounded-full h-1.5">
              <div className={`h-1.5 rounded-full ${e.headerColor}`} style={{ width: `${pctVal}%` }} />
            </div>
            <span className="text-xs font-medium text-gray-700 w-6 text-right">{qtd}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Drill-down de equipe ─────────────────────────────────────────────────────

function EquipeDrilldown({
  gestorId, gestorNome, periodo, onBack,
}: {
  gestorId: string; gestorNome: string; periodo: { inicio: string; fim: string }; onBack: () => void
}) {
  const [dados, setDados] = useState<{ vendedores: VendedorStat[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [ordem, setOrdem] = useState<OrdemVendedor>('faturamento')
  const [asc, setAsc] = useState(false)

  useEffect(() => {
    setLoading(true)
    const params = new URLSearchParams({ inicio: periodo.inicio, fim: periodo.fim })
    fetch(`/api/dashboard/diretor/equipe/${gestorId}?${params}`)
      .then((r) => r.json())
      .then(setDados)
      .finally(() => setLoading(false))
  }, [gestorId, periodo.inicio, periodo.fim])

  const toggleOrdem = (campo: OrdemVendedor) => {
    if (ordem === campo) setAsc((a) => !a)
    else { setOrdem(campo); setAsc(false) }
  }

  const vendedoresOrdenados = dados
    ? [...dados.vendedores].sort((a, b) => {
        const mult = asc ? 1 : -1
        return (a[ordem] as number - (b[ordem] as number)) * mult
      })
    : []

  const exportarExcel = () => {
    if (!dados) return
    const rows = vendedoresOrdenados.map((v) => ({
      'Vendedor': v.vendedor.nome,
      'Leads Recebidos': v.leadsRecebidos,
      'Convertidos': v.convertidos,
      'Taxa Conv. Leads (%)': v.taxaConversaoLeads,
      'Taxa Conv. Carteira (%)': v.taxaConversaoCarteira,
      'Faturamento (R$)': v.faturamento,
      'Fat. Leads (R$)': v.faturamentoLeads,
      'Fat. Carteira (R$)': v.faturamentoCarteira,
      'Ticket Médio Leads (R$)': v.ticketMedioLeads,
      'Ticket Médio Carteira (R$)': v.ticketMedioCarteira,
      'Total Clientes': v.totalClientes,
      'Clientes c/ Recompra': v.clientesComRecompra,
      'Follow-ups em Dia': v.followupsEmDia,
      'Follow-ups Atrasados': v.followupsAtrasados,
      'Desqualificados': v.desqualificados,
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Equipe')
    XLSX.writeFile(wb, `equipe_${gestorNome.replace(/\s/g, '_')}_${format(new Date(periodo.inicio), 'yyyy-MM')}.xlsx`)
  }

  const headerBtn = (label: string, campo: OrdemVendedor) => (
    <th
      className="px-3 py-2 text-left text-xs font-semibold text-gray-600 cursor-pointer hover:text-gray-900 whitespace-nowrap select-none"
      onClick={() => toggleOrdem(campo)}
    >
      {label} {ordem === campo ? (asc ? '↑' : '↓') : ''}
    </th>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
        >
          ← Voltar
        </button>
        <h2 className="text-lg font-bold text-gray-900">Equipe: {gestorNome}</h2>
        <div className="ml-auto">
          <button
            onClick={exportarExcel}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
            <table className="min-w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 whitespace-nowrap">Vendedor</th>
                  {headerBtn('Leads', 'leadsRecebidos')}
                  {headerBtn('Convertidos', 'faturamento')}
                  {headerBtn('Conv. Lead %', 'taxaConversaoLeads')}
                  {headerBtn('Conv. Carteira %', 'taxaConversaoCarteira')}
                  {headerBtn('Faturamento', 'faturamento')}
                  {headerBtn('Ticket Lead', 'ticketMedioLeads')}
                  {headerBtn('Ticket Carteira', 'ticketMedioCarteira')}
                  {headerBtn('FU Atrasados', 'followupsAtrasados')}
                  {headerBtn('Desqualif.', 'desqualificados')}
                  <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600">Etapas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {vendedoresOrdenados.map((v) => (
                  <tr key={v.vendedor.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 py-3 font-medium text-gray-900 whitespace-nowrap">{v.vendedor.nome}</td>
                    <td className="px-3 py-3 text-gray-700">{v.leadsRecebidos}</td>
                    <td className="px-3 py-3 text-gray-700">{v.convertidos}</td>
                    <td className="px-3 py-3">
                      <span className={`font-medium ${v.taxaConversaoLeads >= 30 ? 'text-green-600' : v.taxaConversaoLeads >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {pct(v.taxaConversaoLeads)}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`font-medium ${v.taxaConversaoCarteira >= 30 ? 'text-green-600' : v.taxaConversaoCarteira >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {pct(v.taxaConversaoCarteira)}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(v.faturamento)}</td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{v.ticketMedioLeads > 0 ? formatCurrency(v.ticketMedioLeads) : '—'}</td>
                    <td className="px-3 py-3 text-gray-700 whitespace-nowrap">{v.ticketMedioCarteira > 0 ? formatCurrency(v.ticketMedioCarteira) : '—'}</td>
                    <td className="px-3 py-3">
                      {v.followupsAtrasados > 0
                        ? <span className="text-red-600 font-medium">{v.followupsAtrasados}</span>
                        : <span className="text-gray-400">0</span>}
                    </td>
                    <td className="px-3 py-3 text-gray-700">{v.desqualificados}</td>
                    <td className="px-3 py-3 min-w-48">
                      <EtapaBar leadsPorEtapa={v.leadsPorEtapa} />
                    </td>
                  </tr>
                ))}
                {vendedoresOrdenados.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-3 py-8 text-center text-gray-400 text-sm">
                      Nenhum vendedor encontrado nesta equipe
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="text-xs text-gray-400 text-center">
            Clique nos cabeçalhos das colunas para ordenar. ↑ crescente / ↓ decrescente
          </p>
        </>
      )}
    </div>
  )
}

// ─── Dashboard principal ──────────────────────────────────────────────────────

export function DiretorDashboard() {
  const { user } = useAuth()
  const [dados, setDados] = useState<{ totais: DashboardTotais; equipes: EquipeResumo[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [inicio, setInicio] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [fim, setFim] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [equipeAberta, setEquipeAberta] = useState<{ id: string; nome: string } | null>(null)

  const fetchDados = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ inicio, fim })
    const res = await fetch(`/api/dashboard/diretor?${params}`)
    if (res.ok) setDados(await res.json())
    setLoading(false)
  }, [inicio, fim])

  useEffect(() => { fetchDados() }, [fetchDados])

  const exportarExcel = () => {
    if (!dados) return
    const wsEquipes = XLSX.utils.json_to_sheet(dados.equipes.map((e) => ({
      'Equipe (Gestor)': e.gestor.nome,
      'Leads Recebidos': e.leadsRecebidos,
      'Convertidos': e.convertidos,
      'Faturamento (R$)': e.faturamento,
      'Fat. Leads (R$)': e.faturamentoLeads,
      'Fat. Carteira (R$)': e.faturamentoCarteira,
      'Conv. Leads (%)': e.taxaConversaoLeads,
      'Conv. Carteira (%)': e.taxaConversaoCarteira,
      'Ticket Médio Leads (R$)': e.ticketMedioLeads,
      'Ticket Médio Carteira (R$)': e.ticketMedioCarteira,
      'Total Clientes': e.totalClientes,
      'Clientes c/ Recompra': e.clientesComRecompra,
    })))
    const wsTotais = XLSX.utils.json_to_sheet([{
      'Faturamento Total (R$)': dados.totais.faturamentoTotal,
      'Fat. Leads (R$)': dados.totais.faturamentoLeads,
      'Fat. Carteira (R$)': dados.totais.faturamentoCarteira,
      'Leads Recebidos': dados.totais.leadsRecebidos,
      'Convertidos': dados.totais.convertidos,
      'Conv. Leads (%)': dados.totais.taxaConversaoLeads,
      'Conv. Carteira (%)': dados.totais.taxaConversaoCarteira,
      'Ticket Médio Leads (R$)': dados.totais.ticketMedioLeads,
      'Ticket Médio Carteira (R$)': dados.totais.ticketMedioCarteira,
    }])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, wsTotais, 'Totais')
    XLSX.utils.book_append_sheet(wb, wsEquipes, 'Por Equipe')
    XLSX.writeFile(wb, `dashboard_${inicio}_${fim}.xlsx`)
  }

  if (equipeAberta) {
    return (
      <EquipeDrilldown
        gestorId={equipeAberta.id}
        gestorNome={equipeAberta.nome}
        periodo={{ inicio, fim }}
        onBack={() => setEquipeAberta(null)}
      />
    )
  }

  const t = dados?.totais

  return (
    <div className="space-y-6">
      {/* Filtros de período */}
      <div className="flex flex-wrap items-center gap-3 bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <span className="text-sm font-medium text-gray-700">Período:</span>
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={inicio}
            onChange={(e) => setInicio(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
          <span className="text-gray-400 text-sm">até</span>
          <input
            type="date"
            value={fim}
            onChange={(e) => setFim(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: 'Este mês', fn: () => { setInicio(format(startOfMonth(new Date()), 'yyyy-MM-dd')); setFim(format(endOfMonth(new Date()), 'yyyy-MM-dd')) } },
            { label: 'Últimos 30d', fn: () => { const d = new Date(); d.setDate(d.getDate() - 30); setInicio(format(d, 'yyyy-MM-dd')); setFim(format(new Date(), 'yyyy-MM-dd')) } },
            { label: 'Últimos 90d', fn: () => { const d = new Date(); d.setDate(d.getDate() - 90); setInicio(format(d, 'yyyy-MM-dd')); setFim(format(new Date(), 'yyyy-MM-dd')) } },
          ].map((btn) => (
            <button
              key={btn.label}
              onClick={btn.fn}
              className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600 hover:text-gray-900"
            >
              {btn.label}
            </button>
          ))}
        </div>
        <div className="ml-auto">
          <button
            onClick={exportarExcel}
            disabled={!dados}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Exportar Excel
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full" />
        </div>
      ) : t ? (
        <>
          {/* Cards de totais */}
          <div>
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
              {user?.role === 'diretor' ? 'Empresa (Total)' : 'Sua Equipe (Total)'}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              <StatsCard
                title="Faturamento Total"
                value={formatCurrency(t.faturamentoTotal)}
                subtitle={`Leads: ${formatCurrency(t.faturamentoLeads)} | Carteira: ${formatCurrency(t.faturamentoCarteira)}`}
                variant="success"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
              />
              <StatsCard
                title="Leads Recebidos"
                value={t.leadsRecebidos}
                subtitle={`${t.convertidos} convertidos`}
                variant="default"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
              />
              <StatsCard
                title="Conv. Leads"
                value={pct(t.taxaConversaoLeads)}
                subtitle="leads → venda"
                variant={t.taxaConversaoLeads >= 30 ? 'success' : t.taxaConversaoLeads >= 15 ? 'warning' : 'danger'}
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
              />
              <StatsCard
                title="Conv. Carteira"
                value={pct(t.taxaConversaoCarteira)}
                subtitle={`${t.clientesComRecompra} de ${t.totalClientes} clientes recompraram`}
                variant={t.taxaConversaoCarteira >= 30 ? 'success' : t.taxaConversaoCarteira >= 15 ? 'warning' : 'danger'}
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
              />
              <StatsCard
                title="Ticket Médio Leads"
                value={t.ticketMedioLeads > 0 ? formatCurrency(t.ticketMedioLeads) : '—'}
                subtitle="por venda de novo lead"
                variant="default"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A2 2 0 013 12V7a4 4 0 014-4z" /></svg>}
              />
              <StatsCard
                title="Ticket Médio Carteira"
                value={t.ticketMedioCarteira > 0 ? formatCurrency(t.ticketMedioCarteira) : '—'}
                subtitle="por recompra de cliente"
                variant="default"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" /></svg>}
              />
              <StatsCard
                title="Total Clientes"
                value={t.totalClientes}
                subtitle={`${t.clientesComRecompra} com recompra`}
                variant="default"
                icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>}
              />
            </div>
          </div>

          {/* Leads por etapa (empresa) */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">
              {user?.role === 'diretor' ? 'Leads por Etapa — Empresa' : 'Leads por Etapa — Equipe'}
            </h3>
            <EtapaBar leadsPorEtapa={t.leadsPorEtapa} />
          </div>

          {/* Tabela por equipe */}
          {dados && dados.equipes.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">
                  {user?.role === 'diretor' ? 'Desempenho por Equipe' : 'Detalhamento da Equipe'}
                </h3>
                <p className="text-xs text-gray-400 mt-0.5">Clique em uma equipe para ver o detalhamento por vendedor</p>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Equipe</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Leads</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Conv. Leads</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Conv. Carteira</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Faturamento</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Ticket Lead</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Ticket Carteira</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Clientes</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Etapas</th>
                      <th className="px-4 py-3"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {dados.equipes.map((e) => (
                      <tr
                        key={e.gestor.id}
                        className="hover:bg-green-50 cursor-pointer transition-colors"
                        onClick={() => setEquipeAberta({ id: e.gestor.id, nome: e.gestor.nome })}
                      >
                        <td className="px-4 py-3 font-semibold text-gray-900">{e.gestor.nome}</td>
                        <td className="px-4 py-3 text-gray-700">{e.leadsRecebidos}</td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${e.taxaConversaoLeads >= 30 ? 'text-green-600' : e.taxaConversaoLeads >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {pct(e.taxaConversaoLeads)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`font-medium ${e.taxaConversaoCarteira >= 30 ? 'text-green-600' : e.taxaConversaoCarteira >= 15 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {pct(e.taxaConversaoCarteira)}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(e.faturamento)}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{e.ticketMedioLeads > 0 ? formatCurrency(e.ticketMedioLeads) : '—'}</td>
                        <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{e.ticketMedioCarteira > 0 ? formatCurrency(e.ticketMedioCarteira) : '—'}</td>
                        <td className="px-4 py-3 text-gray-700">{e.totalClientes} <span className="text-xs text-gray-400">({e.clientesComRecompra} recomp.)</span></td>
                        <td className="px-4 py-3 min-w-48"><EtapaBar leadsPorEtapa={e.leadsPorEtapa} /></td>
                        <td className="px-4 py-3">
                          <span className="text-green-600 text-xs font-medium whitespace-nowrap">Ver detalhes →</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <p className="text-center text-gray-400 py-16">Nenhum dado encontrado para o período selecionado.</p>
      )}
    </div>
  )
}
