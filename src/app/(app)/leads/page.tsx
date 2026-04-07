'use client'

import { useEffect, useState, useCallback } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from '@/components/ui/table'
import { NewLeadModal } from '@/components/leads/new-lead-modal'
import { getEtapaColor, getEtapaLabel } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'
import type { Lead } from '@/types'

interface MembroEquipe {
  id: string
  nome: string
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('pt-BR')
}

function formatPhone(w: string) {
  if (!w) return '—'
  const n = w.replace(/\D/g, '')
  if (n.length === 13) return `+${n.slice(0,2)} (${n.slice(2,4)}) ${n.slice(4,9)}-${n.slice(9)}`
  if (n.length === 11) return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`
  return w
}

export default function LeadsPage() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  // Filtros
  const [search, setSearch] = useState('')
  const [etapaFilter, setEtapaFilter] = useState('')
  const [origemFilter, setOrigemFilter] = useState('')
  const [vendedorFilter, setVendedorFilter] = useState('')
  const [chegouInicio, setChegouInicio] = useState('')
  const [chegouFim, setChegouFim] = useState('')
  const [ultimoContatoInicio, setUltimoContatoInicio] = useState('')
  const [ultimoContatoFim, setUltimoContatoFim] = useState('')

  const [equipe, setEquipe] = useState<MembroEquipe[]>([])
  const [total, setTotal] = useState(0)

  const isGestorOuDiretor = user?.role === 'gestor' || user?.role === 'diretor'

  useEffect(() => {
    if (!isGestorOuDiretor) return
    fetch('/api/usuarios')
      .then((r) => r.json())
      .then((d) => setEquipe(d.vendedores || []))
      .catch(() => {})
  }, [isGestorOuDiretor])

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '1000' })
      if (etapaFilter) params.set('etapa', etapaFilter)
      if (origemFilter) params.set('origem', origemFilter)
      if (vendedorFilter) params.set('vendedorId', vendedorFilter)
      if (chegouInicio) params.set('chegouEmInicio', chegouInicio)
      if (chegouFim) params.set('chegouEmFim', chegouFim)
      if (ultimoContatoInicio) params.set('ultimoContatoInicio', ultimoContatoInicio)
      if (ultimoContatoFim) params.set('ultimoContatoFim', ultimoContatoFim)

      const res = await fetch(`/api/leads?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLeads(data.leads)
        setTotal(data.total)
      }
    } finally {
      setLoading(false)
    }
  }, [etapaFilter, origemFilter, vendedorFilter, chegouInicio, chegouFim, ultimoContatoInicio, ultimoContatoFim])

  useEffect(() => { fetchLeads() }, [fetchLeads])

  const filtered = leads.filter((l) =>
    !search ||
    l.nomeCliente.toLowerCase().includes(search.toLowerCase()) ||
    l.whatsapp.includes(search)
  )

  const handleExport = () => {
    const params = new URLSearchParams()
    if (etapaFilter) params.set('etapa', etapaFilter)
    if (origemFilter) params.set('origem', origemFilter)
    if (vendedorFilter) params.set('vendedorId', vendedorFilter)
    if (chegouInicio) params.set('chegouEmInicio', chegouInicio)
    if (chegouFim) params.set('chegouEmFim', chegouFim)
    if (ultimoContatoInicio) params.set('ultimoContatoInicio', ultimoContatoInicio)
    if (ultimoContatoFim) params.set('ultimoContatoFim', ultimoContatoFim)
    if (search) params.set('busca', search)
    window.open(`/api/exportar/leads?${params}`, '_blank')
  }

  const handleLimparFiltros = () => {
    setEtapaFilter('')
    setOrigemFilter('')
    setVendedorFilter('')
    setChegouInicio('')
    setChegouFim('')
    setUltimoContatoInicio('')
    setUltimoContatoFim('')
    setSearch('')
  }

  const temFiltroAtivo = etapaFilter || origemFilter || vendedorFilter || chegouInicio || chegouFim || ultimoContatoInicio || ultimoContatoFim || search

  return (
    <div>
      <Header title="Lista de Leads" />
      <div className="p-4 lg:p-6 space-y-4">

        {/* Filtros */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-700">Filtros</h3>
            {temFiltroAtivo && (
              <button
                onClick={handleLimparFiltros}
                className="text-xs text-red-500 hover:text-red-700 font-medium"
              >
                Limpar filtros
              </button>
            )}
          </div>

          {/* Linha 1: busca + etapa + origem + vendedor */}
          <div className="flex flex-wrap gap-3">
            <div className="flex-1 min-w-48">
              <Input
                placeholder="Buscar por nome ou WhatsApp..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                }
              />
            </div>
            <div className="w-48">
              <Select
                value={etapaFilter}
                onChange={(e) => setEtapaFilter(e.target.value)}
                options={[
                  { value: '', label: 'Todas as etapas' },
                  { value: 'fez_contato', label: 'Fez Contato' },
                  { value: 'proposta_enviada', label: 'Proposta Enviada' },
                  { value: 'negociacao', label: 'Negociação' },
                  { value: 'chamar_depois', label: 'Chamar Depois' },
                  { value: 'correios', label: 'Correios' },
                  { value: 'comprou', label: 'Comprou' },
                  { value: 'voltou', label: 'Voltou' },
                  { value: 'desqualificado', label: 'Desqualificado' },
                  { value: 'geladeira', label: 'Geladeira' },
                ]}
              />
            </div>
            <div className="w-40">
              <Select
                value={origemFilter}
                onChange={(e) => setOrigemFilter(e.target.value)}
                options={[
                  { value: '', label: 'Toda origem' },
                  { value: 'rastreado', label: 'Rastreado (Meta Ads)' },
                  { value: 'nao_rastreado', label: 'Não rastreado' },
                ]}
              />
            </div>
            {isGestorOuDiretor && equipe.length > 0 && (
              <div className="w-44">
                <Select
                  value={vendedorFilter}
                  onChange={(e) => setVendedorFilter(e.target.value)}
                  options={[
                    { value: '', label: 'Toda a equipe' },
                    ...equipe.map((m) => ({ value: m.id, label: m.nome })),
                  ]}
                />
              </div>
            )}
          </div>

          {/* Linha 2: datas */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex items-end gap-2">
              <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Data de entrada:</label>
              <input
                type="date"
                value={chegouInicio}
                onChange={(e) => setChegouInicio(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <span className="text-xs text-gray-400">até</span>
              <input
                type="date"
                value={chegouFim}
                onChange={(e) => setChegouFim(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <div className="flex items-end gap-2">
              <label className="text-xs font-medium text-gray-500 whitespace-nowrap">Último contato:</label>
              <input
                type="date"
                value={ultimoContatoInicio}
                onChange={(e) => setUltimoContatoInicio(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <span className="text-xs text-gray-400">até</span>
              <input
                type="date"
                value={ultimoContatoFim}
                onChange={(e) => setUltimoContatoFim(e.target.value)}
                className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>
        </div>

        {/* Contagem + ações */}
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            <span className="font-semibold text-gray-900">{filtered.length}</span> lead(s) encontrado(s)
            {temFiltroAtivo && (
              <span className="ml-2 text-xs text-green-600 font-medium">com filtros aplicados</span>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Exportar lista ({filtered.length})
            </button>
            <Button onClick={() => setShowNew(true)}>+ Novo Lead</Button>
          </div>
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <Table>
              <TableHead>
                <TableRow>
                  <TableTh>Nome</TableTh>
                  <TableTh>Telefone</TableTh>
                  <TableTh>Data de Entrada</TableTh>
                  <TableTh>Último Contato</TableTh>
                  <TableTh>Origem</TableTh>
                  <TableTh>Status no Kanban</TableTh>
                  {isGestorOuDiretor && <TableTh>Vendedor</TableTh>}
                  <TableTh>{''}</TableTh>
                </TableRow>
              </TableHead>
              <TableBody>
                {filtered.map((lead) => {
                  const ultimoFollowup = (lead as any).followups?.[0]?.criadoEm
                  return (
                    <TableRow key={lead.id}>
                      <TableTd>
                        <p className="font-medium text-gray-900">{lead.nomeCliente}</p>
                      </TableTd>
                      <TableTd>
                        <a
                          href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-700 text-sm font-mono"
                        >
                          {formatPhone(lead.whatsapp)}
                        </a>
                      </TableTd>
                      <TableTd>
                        <span className="text-sm text-gray-700">{formatDate(lead.chegouEm)}</span>
                      </TableTd>
                      <TableTd>
                        <span className="text-sm text-gray-700">{formatDate(ultimoFollowup)}</span>
                      </TableTd>
                      <TableTd>
                        <span className="text-xs text-gray-600">
                          {lead.origem === 'rastreado' ? '📊 Meta Ads' : '📱 Direto'}
                        </span>
                      </TableTd>
                      <TableTd>
                        <Badge className={getEtapaColor(lead.etapa)}>
                          {getEtapaLabel(lead.etapa)}
                        </Badge>
                      </TableTd>
                      {isGestorOuDiretor && (
                        <TableTd>
                          <span className="text-sm text-gray-600">{lead.vendedor?.nome || '—'}</span>
                        </TableTd>
                      )}
                      <TableTd>
                        <Link
                          href={`/leads/${lead.id}`}
                          className="text-green-600 hover:text-green-700 text-sm font-medium"
                        >
                          Ver →
                        </Link>
                      </TableTd>
                    </TableRow>
                  )
                })}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableTd className="text-center text-gray-500 py-12" colSpan={8 as any}>
                      <div className="flex flex-col items-center gap-2">
                        <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        <span>Nenhum lead encontrado com esses filtros</span>
                      </div>
                    </TableTd>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <NewLeadModal
        isOpen={showNew}
        onClose={() => setShowNew(false)}
        onCreated={(l) => { setLeads((prev) => [l, ...prev]); setShowNew(false) }}
      />
    </div>
  )
}
