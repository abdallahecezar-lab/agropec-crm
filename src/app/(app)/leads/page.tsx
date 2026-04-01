'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableHead, TableBody, TableRow, TableTh, TableTd } from '@/components/ui/table'
import { NewLeadModal } from '@/components/leads/new-lead-modal'
import { formatRelativeDate, getEtapaColor, getEtapaLabel, formatCurrency } from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import Link from 'next/link'
import type { Lead } from '@/types'

export default function LeadsPage() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)
  const [search, setSearch] = useState('')
  const [etapaFilter, setEtapaFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: '200' })
      if (etapaFilter) params.set('etapa', etapaFilter)
      if (statusFilter) params.set('statusLead', statusFilter)
      const res = await fetch(`/api/leads?${params}`)
      if (res.ok) {
        const data = await res.json()
        setLeads(data.leads)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLeads() }, [etapaFilter, statusFilter])

  const filtered = leads.filter((l) =>
    !search ||
    l.nomeCliente.toLowerCase().includes(search.toLowerCase()) ||
    l.whatsapp.includes(search)
  )

  return (
    <div>
      <Header title="Leads" />
      <div className="p-4 lg:p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
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
          <div className="w-44">
            <Select
              value={etapaFilter}
              onChange={(e) => setEtapaFilter(e.target.value)}
              options={[
                { value: '', label: 'Todas as etapas' },
                { value: 'fez_contato', label: 'Fez Contato' },
                { value: 'proposta_enviada', label: 'Proposta Enviada' },
                { value: 'negociacao', label: 'Negociação' },
                { value: 'chamar_depois', label: 'Chamar Depois' },
                { value: 'comprou', label: 'Comprou' },
                { value: 'desqualificado', label: 'Desqualificado' },
                { value: 'geladeira', label: 'Geladeira' },
              ]}
            />
          </div>
          <div className="w-40">
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: '', label: 'Todos status' },
                { value: 'ativo', label: 'Ativo' },
                { value: 'convertido', label: 'Convertido' },
                { value: 'desqualificado', label: 'Desqualificado' },
                { value: 'geladeira', label: 'Geladeira' },
              ]}
            />
          </div>
          <Button onClick={() => setShowNew(true)}>+ Novo Lead</Button>
        </div>

        {/* Count */}
        <div className="text-sm text-gray-500">
          <span className="font-medium text-gray-900">{filtered.length}</span> lead(s) encontrado(s)
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <Table>
            <TableHead>
              <TableRow>
                <TableTh>Cliente</TableTh>
                <TableTh>Produto</TableTh>
                <TableTh>Etapa</TableTh>
                {user?.role === 'gestor' && <TableTh>Vendedor</TableTh>}
                <TableTh>Follow-ups</TableTh>
                <TableTh>Valor</TableTh>
                <TableTh>Chegou</TableTh>
                <TableTh>{''}</TableTh>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.map((lead) => (
                <TableRow key={lead.id} onClick={() => {}}>
                  <TableTd>
                    <div>
                      <p className="font-medium text-gray-900">{lead.nomeCliente}</p>
                      <p className="text-xs text-gray-500">{lead.whatsapp}</p>
                    </div>
                  </TableTd>
                  <TableTd>
                    <span className="text-xs text-gray-600">{lead.produto?.nome || '—'}</span>
                  </TableTd>
                  <TableTd>
                    <Badge className={getEtapaColor(lead.etapa)}>
                      {getEtapaLabel(lead.etapa)}
                    </Badge>
                  </TableTd>
                  {user?.role === 'gestor' && (
                    <TableTd>{lead.vendedor?.nome || '—'}</TableTd>
                  )}
                  <TableTd>
                    <span className={`text-sm font-medium ${
                      (lead._count?.followups || 0) >= 8 ? 'text-red-600' :
                      (lead._count?.followups || 0) >= 6 ? 'text-yellow-600' :
                      'text-gray-700'
                    }`}>
                      {lead._count?.followups || 0}
                    </span>
                  </TableTd>
                  <TableTd>
                    {lead.valorLiquido ? formatCurrency(lead.valorLiquido) : '—'}
                  </TableTd>
                  <TableTd>{formatRelativeDate(lead.chegouEm)}</TableTd>
                  <TableTd>
                    <Link
                      href={`/leads/${lead.id}`}
                      className="text-green-600 hover:text-green-700 text-sm font-medium"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Ver
                    </Link>
                  </TableTd>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableTd className="text-center text-gray-500 py-8" colSpan={8 as any}>
                    Nenhum lead encontrado
                  </TableTd>
                </TableRow>
              )}
            </TableBody>
          </Table>
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
