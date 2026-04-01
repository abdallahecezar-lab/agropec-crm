'use client'

import { useEffect, useState } from 'react'
import { StatsCard } from './stats-card'
import { CommissionCard } from './commission-card'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import Link from 'next/link'

interface DashboardData {
  leads: {
    total: number
    ativos: number
    convertidos: number
    desqualificados: number
    geladeira: number
    porEtapa: Record<string, number>
  }
  conversao: number
  tempoMedioResposta: number
  followupHoje: number
  clientesSemContatoMes: number
  comissao: {
    faixa: string
    percentual: number
    comissao: number
    proximaFaixa: number | null
    faltaParaProximaFaixa: number | null
  }
  faturamentoMes: number
  leadsChamarDepoisAtrasados: any[]
  checklistConformidade: number
  reativacoesHoje: any[]
}

export function VendedorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/vendedor')
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!data) return <div className="text-center text-gray-500 py-10">Erro ao carregar dados</div>

  return (
    <div className="space-y-6">
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard
          title="Leads Ativos"
          value={data.leads.ativos}
          subtitle={`${data.leads.total} total`}
          variant="default"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <StatsCard
          title="Conversão"
          value={`${data.conversao.toFixed(1)}%`}
          subtitle="leads convertidos"
          variant={data.conversao >= 15 ? 'success' : data.conversao >= 8 ? 'warning' : 'danger'}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>}
        />
        <StatsCard
          title="Faturamento Mês"
          value={formatCurrency(data.faturamentoMes)}
          subtitle="valor líquido"
          variant="success"
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatsCard
          title="Script (%)"
          value={`${data.checklistConformidade}%`}
          subtitle="conformidade"
          variant={data.checklistConformidade >= 80 ? 'success' : data.checklistConformidade >= 50 ? 'warning' : 'danger'}
          icon={<svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Commission */}
        <div className="lg:col-span-1">
          <CommissionCard
            valorLiquido={data.faturamentoMes}
            {...data.comissao}
          />
        </div>

        {/* Alerts */}
        <div className="lg:col-span-2 space-y-4">
          {/* Overdue calls */}
          {data.leadsChamarDepoisAtrasados.length > 0 && (
            <Card padding="md">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-red-500">⏰</span>
                <h3 className="font-semibold text-gray-900">Chamadas Atrasadas</h3>
                <span className="ml-auto text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                  {data.leadsChamarDepoisAtrasados.length}
                </span>
              </div>
              <div className="space-y-2">
                {data.leadsChamarDepoisAtrasados.map((lead: any) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="flex items-center justify-between p-2.5 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-900">{lead.nomeCliente}</p>
                      <p className="text-xs text-gray-500">
                        Agendado para {lead.agendadoPara ? formatDateTime(lead.agendadoPara) : ''}
                      </p>
                    </div>
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* Reativações today */}
          {data.reativacoesHoje.length > 0 && (
            <Card padding="md">
              <div className="flex items-center gap-2 mb-3">
                <span>❄️</span>
                <h3 className="font-semibold text-gray-900">Reativar Geladeira Hoje</h3>
                <span className="ml-auto text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  {data.reativacoesHoje.length}
                </span>
              </div>
              <div className="space-y-2">
                {data.reativacoesHoje.map((lead: any) => (
                  <Link
                    key={lead.id}
                    href={`/geladeira`}
                    className="flex items-center justify-between p-2.5 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <p className="text-sm font-medium text-gray-900">{lead.nomeCliente}</p>
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                ))}
              </div>
            </Card>
          )}

          {/* Quick stats */}
          <Card padding="md">
            <h3 className="font-semibold text-gray-900 mb-3">Resumo de Hoje</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Tempo médio de resposta</p>
                <p className="text-lg font-bold text-gray-900">
                  {data.tempoMedioResposta < 60
                    ? `${data.tempoMedioResposta}min`
                    : `${Math.floor(data.tempoMedioResposta / 60)}h`}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Follow-ups hoje</p>
                <p className="text-lg font-bold text-gray-900">{data.followupHoje}</p>
              </div>
              <div className={`p-3 rounded-lg ${data.clientesSemContatoMes > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <p className="text-xs text-gray-500">Clientes sem contato</p>
                <p className={`text-lg font-bold ${data.clientesSemContatoMes > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {data.clientesSemContatoMes}
                </p>
              </div>
              <div className="p-3 bg-gray-50 rounded-lg">
                <p className="text-xs text-gray-500">Geladeira</p>
                <p className="text-lg font-bold text-gray-900">{data.leads.geladeira}</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
