'use client'

import { formatCurrency } from '@/lib/utils'
import { COMMISSION_TABLE } from '@/lib/constants'

interface CommissionCardProps {
  valorLiquido: number
  faixa: string
  percentual: number
  comissao: number
  proximaFaixa: number | null
  faltaParaProximaFaixa: number | null
}

export function CommissionCard({ valorLiquido, faixa, percentual, comissao, proximaFaixa, faltaParaProximaFaixa }: CommissionCardProps) {
  const maxFaixa = 62000
  const pctProgress = Math.min((valorLiquido / maxFaixa) * 100, 100)

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
      <h3 className="font-semibold text-gray-900 mb-4">Comissão do Mês</h3>

      {/* Main commission */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl p-5 text-white mb-4">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-green-100 text-sm">Comissão estimada</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(comissao)}</p>
          </div>
          <div className="text-right">
            <p className="text-green-100 text-xs">Faturamento líquido</p>
            <p className="text-xl font-bold">{formatCurrency(valorLiquido)}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-white/20">
          <p className="text-green-100 text-xs">Faixa atual: {faixa} — {percentual}%</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progresso</span>
          <span>{formatCurrency(valorLiquido)} / {formatCurrency(maxFaixa)}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all"
            style={{ width: `${pctProgress}%` }}
          />
        </div>
      </div>

      {/* Next tier */}
      {faltaParaProximaFaixa !== null && faltaParaProximaFaixa > 0 && (
        <div className="p-3 bg-green-50 rounded-lg">
          <p className="text-sm text-green-800">
            🎯 Faltam <strong>{formatCurrency(faltaParaProximaFaixa)}</strong> para a próxima faixa
            {proximaFaixa && ` (${formatCurrency(proximaFaixa)})`}
          </p>
        </div>
      )}

      {/* Table */}
      <div className="mt-4">
        <p className="text-xs font-semibold text-gray-500 uppercase mb-2">Tabela de Comissão</p>
        <div className="space-y-1">
          {COMMISSION_TABLE.map((row, i) => {
            const isActive = valorLiquido >= row.min && valorLiquido <= row.max
            return (
              <div
                key={i}
                className={`flex items-center justify-between text-xs px-2 py-1.5 rounded ${
                  isActive ? 'bg-green-100 text-green-800 font-semibold' : 'text-gray-600'
                }`}
              >
                <span>{row.label}</span>
                <span className={isActive ? 'text-green-700' : 'text-gray-500'}>{row.pct}%</span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Fixed salary note */}
      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
        <p className="text-xs text-gray-600 font-medium">Salário Fixo</p>
        <div className="text-xs text-gray-500 mt-1 space-y-0.5">
          <div>• R$ 1.000 no dia 20</div>
          <div>• R$ 1.000 no 5° dia útil do mês seguinte</div>
        </div>
      </div>
    </div>
  )
}
