'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/input'
import {
  formatDateTime,
  formatRelativeDate,
  getWhatsAppLink,
  formatWhatsApp,
} from '@/lib/utils'
import type { Lead } from '@/types'

export default function GeladeiraPage() {
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null)
  const [showReativarModal, setShowReativarModal] = useState(false)
  const [reativarForm, setReativarForm] = useState({
    resultado: 'respondeu',
    observacao: '',
    voltouAoFunil: false,
    etapaRetorno: 'proposta_enviada',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/geladeira')
      if (res.ok) {
        const data = await res.json()
        setLeads(data.leads || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLeads() }, [])

  const handleReativar = async () => {
    if (!selectedLead) return
    setSaving(true)
    setError('')

    try {
      const res = await fetch(`/api/geladeira/${selectedLead.id}/reativar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(reativarForm),
      })

      const data = await res.json()

      if (res.ok) {
        if (reativarForm.voltouAoFunil) {
          setLeads((prev) => prev.filter((l) => l.id !== selectedLead.id))
        } else {
          fetchLeads()
        }
        setShowReativarModal(false)
        setSelectedLead(null)
        setReativarForm({ resultado: 'respondeu', observacao: '', voltouAoFunil: false, etapaRetorno: 'proposta_enviada' })
      } else {
        setError(data.error || 'Erro ao reativar lead')
      }
    } finally {
      setSaving(false)
    }
  }

  const openReativarModal = (lead: Lead) => {
    setSelectedLead(lead)
    setShowReativarModal(true)
    setError('')
  }

  // Separate: overdue reactivations vs upcoming
  const vencidos = leads.filter((l) => l.proximaReativacao && new Date(l.proximaReativacao) <= new Date())
  const proximos = leads.filter((l) => !l.proximaReativacao || new Date(l.proximaReativacao) > new Date())

  return (
    <div>
      <Header title="Geladeira" />
      <div className="p-4 lg:p-6 space-y-4">
        {/* Info banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-sm text-blue-800">
            <strong>Geladeira</strong> são leads frios que não converteram. Eles podem ser reativados e voltar ao funil de vendas a qualquer momento.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="bg-white rounded-xl border p-4">
            <p className="text-2xl font-bold text-gray-900">{leads.length}</p>
            <p className="text-xs text-gray-500 mt-1">Total na geladeira</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-200 p-4">
            <p className="text-2xl font-bold text-red-700">{vencidos.length}</p>
            <p className="text-xs text-red-600 mt-1">Para reativar hoje</p>
          </div>
          <div className="bg-white rounded-xl border p-4">
            <p className="text-2xl font-bold text-gray-900">{proximos.length}</p>
            <p className="text-xs text-gray-500 mt-1">Aguardando</p>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
          </div>
        ) : leads.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <span className="text-5xl">🧊</span>
            <p className="font-medium mt-3">Geladeira vazia</p>
            <p className="text-sm mt-1">Leads que esfriaram aparecem aqui</p>
          </div>
        ) : (
          <>
            {/* Vencidos */}
            {vencidos.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-2">
                  🔴 Para reativar hoje ({vencidos.length})
                </h2>
                <div className="space-y-3">
                  {vencidos.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} onReativar={openReativarModal} isVencido />
                  ))}
                </div>
              </div>
            )}

            {/* Proximos */}
            {proximos.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold text-gray-600 mb-2 flex items-center gap-2">
                  ⏳ Aguardando reativação ({proximos.length})
                </h2>
                <div className="space-y-3">
                  {proximos.map((lead) => (
                    <LeadCard key={lead.id} lead={lead} onReativar={openReativarModal} isVencido={false} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Reativar Modal */}
      <Modal
        isOpen={showReativarModal}
        onClose={() => setShowReativarModal(false)}
        title={`Reativar: ${selectedLead?.nomeCliente}`}
      >
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}

          <Select
            label="Resultado do contato *"
            value={reativarForm.resultado}
            onChange={(e) => setReativarForm((p) => ({ ...p, resultado: e.target.value }))}
            options={[
              { value: 'respondeu', label: 'Respondeu' },
              { value: 'nao_respondeu', label: 'Não respondeu' },
              { value: 'demonstrou_interesse', label: 'Demonstrou interesse' },
              { value: 'pediu_retorno', label: 'Pediu retorno' },
              { value: 'sem_interesse', label: 'Sem interesse' },
            ]}
          />

          <Textarea
            label="Observação"
            value={reativarForm.observacao}
            onChange={(e) => setReativarForm((p) => ({ ...p, observacao: e.target.value }))}
            placeholder="Detalhes da tentativa de reativação..."
            rows={2}
          />

          <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg border border-green-200">
            <input
              type="checkbox"
              id="voltouAoFunil"
              checked={reativarForm.voltouAoFunil}
              onChange={(e) => setReativarForm((p) => ({ ...p, voltouAoFunil: e.target.checked }))}
              className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <label htmlFor="voltouAoFunil" className="text-sm text-green-800 font-medium cursor-pointer">
              Lead voltou ao funil de vendas
            </label>
          </div>

          {reativarForm.voltouAoFunil && (
            <Select
              label="Etapa de retorno *"
              value={reativarForm.etapaRetorno}
              onChange={(e) => setReativarForm((p) => ({ ...p, etapaRetorno: e.target.value }))}
              options={[
                { value: 'proposta_enviada', label: 'Proposta Enviada' },
                { value: 'negociacao', label: 'Negociação' },
              ]}
            />
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={handleReativar} loading={saving} className="flex-1">
              Registrar Reativação
            </Button>
            <Button variant="outline" onClick={() => setShowReativarModal(false)} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function LeadCard({
  lead,
  onReativar,
  isVencido,
}: {
  lead: Lead
  onReativar: (lead: Lead) => void
  isVencido: boolean
}) {
  return (
    <div className={`bg-white rounded-xl border p-4 ${isVencido ? 'border-red-200' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-semibold text-gray-900">{lead.nomeCliente}</h3>
            <Badge variant={isVencido ? 'danger' : 'default'}>
              {lead.tentativasReativacao} tentativas
            </Badge>
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
            <a
              href={getWhatsAppLink(lead.whatsapp)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-700"
              onClick={(e) => e.stopPropagation()}
            >
              {formatWhatsApp(lead.whatsapp)}
            </a>
            {lead.produto && <span>📦 {lead.produto.nome}</span>}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-400 mt-2">
            {lead.entadaGeladeira && (
              <span>Entrou: {formatRelativeDate(lead.entadaGeladeira)}</span>
            )}
            {lead.proximaReativacao && (
              <span className={isVencido ? 'text-red-600 font-medium' : ''}>
                Reativar: {formatDateTime(lead.proximaReativacao)}
              </span>
            )}
            <span>{(lead as any)._count?.followups || 0} follow-ups anteriores</span>
          </div>
        </div>

        <Button
          size="sm"
          variant={isVencido ? 'primary' : 'outline'}
          onClick={() => onReativar(lead)}
        >
          Reativar
        </Button>
      </div>
    </div>
  )
}
