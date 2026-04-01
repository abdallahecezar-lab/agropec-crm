'use client'

import { useEffect, useState } from 'react'
import { StatsCard } from './stats-card'
import { formatCurrency } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'

interface GestorData {
  totais: {
    leads: number
    convertidos: number
    faturamento: number
    clientes: number
    leadsAtrasados: number
  }
  vendedores: Array<{
    vendedor: { id: string; nome: string }
    leads: number
    convertidos: number
    faturamento: number
    taxaConversao: number
    checklistConformidade: number
    clientesCuidados: number
  }>
  leadsPorEtapa: Record<string, number>
  faturamentoPorDia: Array<{ dia: string; valor: number }>
  rankingFaturamento: any[]
}

const ETAPA_COLORS: Record<string, string> = {
  fez_contato: '#3b82f6',
  proposta_enviada: '#eab308',
  negociacao: '#f97316',
  chamar_depois: '#8b5cf6',
  comprou: '#22c55e',
  desqualificado: '#ef4444',
  geladeira: '#64748b',
}

const ETAPA_LABELS: Record<string, string> = {
  fez_contato: 'Fez Contato',
  proposta_enviada: 'Proposta',
  negociacao: 'Negociação',
  chamar_depois: 'Chamar Depois',
  comprou: 'Comprou',
  desqualificado: 'Desqualificado',
  geladeira: 'Geladeira',
}

export function GestorDashboard() {
  const [data, setData] = useState<GestorData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/dashboard/gestor')
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

  const pieData = Object.entries(data.leadsPorEtapa)
    .filter(([, v]) => v > 0)
    .map(([etapa, count]) => ({
      name: ETAPA_LABELS[etapa] || etapa,
      value: count,
      color: ETAPA_COLORS[etapa] || '#888',
    }))

  return (
    <div className="space-y-6">
      {/* Totals */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard title="Total Leads" value={data.totais.leads} variant="default" />
        <StatsCard title="Convertidos" value={data.totais.convertidos} variant="success" />
        <StatsCard title="Faturamento" value={formatCurrency(data.totais.faturamento)} variant="success" />
        <StatsCard title="Clientes Carteira" value={data.totais.clientes} variant="default" />
        <StatsCard
          title="Atrasados"
          value={data.totais.leadsAtrasados}
          variant={data.totais.leadsAtrasados > 0 ? 'danger' : 'success'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Faturamento chart */}
        <Card padding="md">
          <h3 className="font-semibold text-gray-900 mb-4">Faturamento Últimos 30 Dias</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.faturamentoPorDia.filter((d) => d.valor > 0)} barSize={20}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="dia" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${v / 1000}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} />
              <Bar dataKey="valor" fill="#22c55e" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Leads por etapa */}
        <Card padding="md">
          <h3 className="font-semibold text-gray-900 mb-4">Leads por Etapa</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend iconType="circle" iconSize={10} />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Vendedor ranking */}
      <Card padding="md">
        <h3 className="font-semibold text-gray-900 mb-4">Performance por Vendedor</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 uppercase pb-2">Vendedor</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase pb-2">Leads</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase pb-2">Convertidos</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase pb-2">Conversão</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase pb-2">Faturamento</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase pb-2">Script %</th>
                <th className="text-right text-xs font-semibold text-gray-500 uppercase pb-2">Carteira</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {data.vendedores
                .sort((a, b) => b.faturamento - a.faturamento)
                .map((v, i) => (
                  <tr key={v.vendedor.id} className="hover:bg-gray-50">
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold ${i === 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                          #{i + 1}
                        </span>
                        <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center text-xs font-bold text-green-700">
                          {v.vendedor.nome.charAt(0)}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{v.vendedor.nome}</span>
                      </div>
                    </td>
                    <td className="py-3 text-right text-sm text-gray-700">{v.leads}</td>
                    <td className="py-3 text-right text-sm text-gray-700">{v.convertidos}</td>
                    <td className="py-3 text-right">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        v.taxaConversao >= 15 ? 'bg-green-100 text-green-700' :
                        v.taxaConversao >= 8 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {v.taxaConversao.toFixed(1)}%
                      </span>
                    </td>
                    <td className="py-3 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(v.faturamento)}
                    </td>
                    <td className="py-3 text-right">
                      <span className={`text-xs font-medium ${
                        v.checklistConformidade >= 80 ? 'text-green-600' :
                        v.checklistConformidade >= 50 ? 'text-yellow-600' :
                        'text-red-600'
                      }`}>
                        {v.checklistConformidade}%
                      </span>
                    </td>
                    <td className="py-3 text-right text-sm text-gray-700">{v.clientesCuidados}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
