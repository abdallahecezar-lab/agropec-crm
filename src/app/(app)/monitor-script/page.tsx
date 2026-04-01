'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

interface VendedorScript {
  vendedor: { id: string; nome: string }
  totalLeads: number
  mediaConformidade: number
  leadsComChecklist: number
  leadsChecklistCompleto: number
  passosMedios: number
  distribuicaoPorPasso: Record<number, number>
}

interface ScriptMonitorData {
  vendedores: VendedorScript[]
  mediaGeral: number
  leadsIncompletos: Array<{
    id: string
    nomeCliente: string
    vendedor: { nome: string }
    concluidos: number
    total: number
    pct: number
  }>
}

const SCRIPT_ITEMS = [
  'Apresentou e perguntou o nome',
  'Enviou áudio inicial',
  'Enviou foto + forma de utilização',
  'Enviou combos promocionais',
  'Explicou frete grátis e pagamento',
  'Perguntou se combos atendem necessidade',
  'Tratou objeções',
  'Registrou follow-up',
]

export default function MonitorScriptPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<ScriptMonitorData | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'ranking' | 'incompletos'>('ranking')

  useEffect(() => {
    if (user && user.role !== 'gestor') {
      router.push('/dashboard')
      return
    }

    const fetchData = async () => {
      try {
        const res = await fetch('/api/monitor-script')
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } finally {
        setLoading(false)
      }
    }
    if (user) fetchData()
  }, [user])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!data) return null

  const getConformidadeColor = (pct: number) => {
    if (pct >= 80) return 'text-green-700 bg-green-100'
    if (pct >= 50) return 'text-yellow-700 bg-yellow-100'
    return 'text-red-700 bg-red-100'
  }

  const getBarColor = (pct: number) => {
    if (pct >= 80) return 'bg-green-500'
    if (pct >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  return (
    <div>
      <Header title="Monitor do Script" />
      <div className="p-4 lg:p-6 space-y-4 max-w-5xl mx-auto">
        {/* Summary */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500">Conformidade média</p>
            <p className={cn(
              'text-2xl font-bold mt-1',
              data.mediaGeral >= 80 ? 'text-green-700' :
              data.mediaGeral >= 50 ? 'text-yellow-700' : 'text-red-700'
            )}>
              {data.mediaGeral.toFixed(1)}%
            </p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500">Vendedores</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{data.vendedores.length}</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4">
            <p className="text-xs text-red-600">Scripts incompletos</p>
            <p className="text-2xl font-bold text-red-700 mt-1">{data.leadsIncompletos.length}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('ranking')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'ranking' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
            }`}
          >
            Ranking por vendedor
          </button>
          <button
            onClick={() => setActiveTab('incompletos')}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
              activeTab === 'incompletos' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
            }`}
          >
            Scripts incompletos ({data.leadsIncompletos.length})
          </button>
        </div>

        {activeTab === 'ranking' && (
          <div className="space-y-4">
            {data.vendedores
              .sort((a, b) => b.mediaConformidade - a.mediaConformidade)
              .map((v, idx) => (
                <div key={v.vendedor.id} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0',
                        idx === 0 ? 'bg-yellow-400 text-white' :
                        idx === 1 ? 'bg-gray-400 text-white' :
                        idx === 2 ? 'bg-amber-600 text-white' :
                        'bg-gray-200 text-gray-600'
                      )}>
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">{v.vendedor.nome}</h3>
                        <p className="text-xs text-gray-500">{v.totalLeads} leads no período</p>
                      </div>
                    </div>
                    <Badge className={getConformidadeColor(v.mediaConformidade)}>
                      {v.mediaConformidade.toFixed(1)}%
                    </Badge>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Conformidade média</span>
                      <span>{v.mediaConformidade.toFixed(1)}%</span>
                    </div>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={cn('h-full rounded-full transition-all', getBarColor(v.mediaConformidade))}
                        style={{ width: `${v.mediaConformidade}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <p className="text-sm font-bold text-gray-900">{v.leadsComChecklist}</p>
                      <p className="text-xs text-gray-500">c/ checklist</p>
                    </div>
                    <div className="p-2 bg-green-50 rounded-lg">
                      <p className="text-sm font-bold text-green-700">{v.leadsChecklistCompleto}</p>
                      <p className="text-xs text-green-600">completos</p>
                    </div>
                    <div className="p-2 bg-gray-50 rounded-lg">
                      <p className="text-sm font-bold text-gray-900">{v.passosMedios.toFixed(1)}</p>
                      <p className="text-xs text-gray-500">passos médios</p>
                    </div>
                  </div>

                  {/* Step breakdown */}
                  {v.totalLeads > 0 && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-2">Execução por passo</p>
                      <div className="grid grid-cols-4 sm:grid-cols-8 gap-1">
                        {SCRIPT_ITEMS.map((label, i) => {
                          const pct = v.distribuicaoPorPasso[i + 1] || 0
                          return (
                            <div key={i} className="text-center" title={label}>
                              <div className="text-xs font-mono text-gray-400 mb-1">{i + 1}</div>
                              <div className="h-8 bg-gray-200 rounded relative overflow-hidden">
                                <div
                                  className={cn('absolute bottom-0 w-full transition-all', getBarColor(pct))}
                                  style={{ height: `${pct}%` }}
                                />
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">{pct}%</div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              ))}
          </div>
        )}

        {activeTab === 'incompletos' && (
          <div className="space-y-3">
            {data.leadsIncompletos.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <p>Todos os scripts estão completos!</p>
              </div>
            ) : (
              data.leadsIncompletos.map((lead) => (
                <div key={lead.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{lead.nomeCliente}</h3>
                        <span className="text-xs text-gray-500">· {lead.vendedor.nome}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="h-2 w-32 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className={cn('h-full rounded-full', getBarColor(lead.pct))}
                            style={{ width: `${lead.pct}%` }}
                          />
                        </div>
                        <span className={cn('text-sm font-medium', lead.pct >= 80 ? 'text-green-700' : lead.pct >= 50 ? 'text-yellow-700' : 'text-red-700')}>
                          {lead.concluidos}/{lead.total} ({lead.pct.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                    <a
                      href={`/leads/${lead.id}`}
                      className="text-green-600 hover:text-green-700 text-sm font-medium"
                    >
                      Ver lead →
                    </a>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  )
}
