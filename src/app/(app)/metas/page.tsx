'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { formatCurrency } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'

interface MetasData {
  mes: string
  faturamentoBruto: number
  faturamentoLiquido: number
  vendas: number
  ticketMedioBruto: number
  ticketMedioLiquido: number
  comissao: {
    faixa: string
    percentual: number
    comissao: number
    proximaFaixa: number | null
    faltaParaProximaFaixa: number | null
  }
  projecao: number
  diasUteis: { total: number; decorridos: number }
  salarioFixo: {
    parcela1: { valor: number; data: string }
    parcela2: { valor: number; data: string }
    total: number
  }
  remuneracaoTotal: number
  rankingGestor?: Array<{
    vendedor: { id: string; nome: string }
    faturamentoLiquido: number
    comissao: number
    percentual: number
  }>
}

const FAIXAS = [
  { label: 'Abaixo de R$ 16.000', min: 0, max: 16000, pct: 0 },
  { label: 'R$ 16.001 – R$ 19.000', min: 16001, max: 19000, pct: 3 },
  { label: 'R$ 19.001 – R$ 21.000', min: 19001, max: 21000, pct: 6 },
  { label: 'R$ 21.001 – R$ 26.000', min: 21001, max: 26000, pct: 8 },
  { label: 'R$ 26.001 – R$ 31.000', min: 26001, max: 31000, pct: 12 },
  { label: 'R$ 31.001 – R$ 35.000', min: 31001, max: 35000, pct: 16 },
  { label: 'R$ 35.001 – R$ 40.000', min: 35001, max: 40000, pct: 18 },
  { label: 'R$ 40.001 – R$ 61.999', min: 40001, max: 61999, pct: 20 },
  { label: 'Acima de R$ 62.000', min: 62000, max: Infinity, pct: 26 },
]

export default function MetasPage() {
  const { user } = useAuth()
  const [data, setData] = useState<MetasData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetas = async () => {
      try {
        const res = await fetch('/api/metas')
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } finally {
        setLoading(false)
      }
    }
    fetchMetas()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!data) return null

  const faixaAtual = FAIXAS.find(
    (f) => data.faturamentoLiquido >= f.min && data.faturamentoLiquido <= f.max
  ) || FAIXAS[0]
  const faixaIdx = FAIXAS.findIndex((f) => f === faixaAtual)
  const progressoFaixa = faixaAtual.max !== Infinity
    ? Math.min(100, ((data.faturamentoLiquido - faixaAtual.min) / (faixaAtual.max - faixaAtual.min)) * 100)
    : 100

  return (
    <div>
      <Header title="Metas e Comissões" />
      <div className="p-4 lg:p-6 space-y-4 max-w-4xl mx-auto">
        {/* Period */}
        <div className="text-sm text-gray-500">
          Período: <span className="font-medium text-gray-900 capitalize">{data.mes}</span>
          {' '} · {data.diasUteis.decorridos} de {data.diasUteis.total} dias úteis
        </div>

        {/* Main financial cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500">Faturamento bruto</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(data.faturamentoBruto)}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500">Faturamento líquido</p>
            <p className="text-lg font-bold text-green-700 mt-1">{formatCurrency(data.faturamentoLiquido)}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500">Ticket médio bruto</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(data.ticketMedioBruto)}</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-xs text-gray-500">Ticket médio líquido</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatCurrency(data.ticketMedioLiquido)}</p>
          </div>
        </div>

        {/* Commission card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Comissão do Mês</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5">
            <div className="text-center p-4 bg-green-50 rounded-xl border border-green-200">
              <p className="text-xs text-green-600 mb-1">Comissão estimada</p>
              <p className="text-3xl font-black text-green-700">{formatCurrency(data.comissao.comissao)}</p>
            </div>
            <div className="text-center p-4 bg-gray-50 rounded-xl border">
              <p className="text-xs text-gray-500 mb-1">Faixa atual</p>
              <p className="text-xl font-bold text-gray-900">{data.comissao.percentual}%</p>
              <p className="text-xs text-gray-500 mt-1">{data.comissao.faixa}</p>
            </div>
            <div className="text-center p-4 bg-blue-50 rounded-xl border border-blue-200">
              <p className="text-xs text-blue-600 mb-1">Salário fixo</p>
              <p className="text-3xl font-black text-blue-700">{formatCurrency(data.salarioFixo.total)}</p>
            </div>
          </div>

          {/* Total remuneration */}
          <div className="p-4 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl text-white mb-5">
            <p className="text-sm opacity-90">Remuneração total estimada</p>
            <p className="text-3xl font-black mt-1">{formatCurrency(data.remuneracaoTotal)}</p>
            <p className="text-xs opacity-75 mt-1">Fixo + comissão</p>
          </div>

          {/* Next tier */}
          {data.comissao.faltaParaProximaFaixa && data.comissao.proximaFaixa && (
            <div className="mb-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-600">Progresso até próxima faixa</span>
                <span className="font-medium text-gray-900">
                  Falta {formatCurrency(data.comissao.faltaParaProximaFaixa)}
                </span>
              </div>
              <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${progressoFaixa}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-400 mt-1">
                <span>{formatCurrency(faixaAtual.min)}</span>
                <span>{formatCurrency(faixaAtual.max)}</span>
              </div>
            </div>
          )}

          {/* Projection */}
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              📊 Projeção do mês: <strong>{formatCurrency(data.projecao)}</strong>
              <span className="text-xs text-blue-600 ml-1">
                (com base em {data.diasUteis.decorridos} dias úteis decorridos)
              </span>
            </p>
          </div>
        </div>

        {/* Salary info */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Salário Fixo</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 bg-gray-50 rounded-xl border">
              <p className="text-xs text-gray-500">1ª Parcela</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(data.salarioFixo.parcela1.valor)}</p>
              <p className="text-xs text-gray-500 mt-1">Pago no dia 20</p>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl border">
              <p className="text-xs text-gray-500">2ª Parcela</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{formatCurrency(data.salarioFixo.parcela2.valor)}</p>
              <p className="text-xs text-gray-500 mt-1">5º dia útil do mês seguinte</p>
            </div>
          </div>
        </div>

        {/* Commission table */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Tabela de Comissões</h2>
          <div className="space-y-2">
            {FAIXAS.map((faixa, idx) => {
              const isAtual = idx === faixaIdx
              const isPassed = idx < faixaIdx
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between p-3 rounded-lg border text-sm ${
                    isAtual
                      ? 'bg-green-50 border-green-300 font-semibold'
                      : isPassed
                      ? 'bg-gray-50 border-gray-200 text-gray-400'
                      : 'bg-white border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isAtual && <span className="w-2 h-2 rounded-full bg-green-500" />}
                    {isPassed && <span className="w-2 h-2 rounded-full bg-gray-300" />}
                    {!isAtual && !isPassed && <span className="w-2 h-2 rounded-full bg-gray-200" />}
                    <span>{faixa.label}</span>
                  </div>
                  <span className={`font-bold ${isAtual ? 'text-green-700' : isPassed ? 'text-gray-400' : 'text-gray-700'}`}>
                    {faixa.pct}%
                  </span>
                </div>
              )
            })}
          </div>
          <p className="text-xs text-gray-500 mt-3">
            ⚠️ A comissão é calculada sobre o faturamento líquido total do mês (não progressiva).
          </p>
        </div>

        {/* Gestor: ranking */}
        {user?.role === 'gestor' && data.rankingGestor && data.rankingGestor.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
            <h2 className="font-bold text-gray-900 mb-4">Ranking do Time</h2>
            <div className="space-y-3">
              {data.rankingGestor.map((item, idx) => (
                <div key={item.vendedor.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                    idx === 0 ? 'bg-yellow-400 text-white' :
                    idx === 1 ? 'bg-gray-400 text-white' :
                    idx === 2 ? 'bg-amber-600 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {idx + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900">{item.vendedor.nome}</p>
                    <p className="text-xs text-gray-500">
                      Faturamento líquido: {formatCurrency(item.faturamentoLiquido)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-green-700">{formatCurrency(item.comissao)}</p>
                    <p className="text-xs text-gray-500">{item.percentual}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
