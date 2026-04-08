'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { FollowupSection } from '@/components/leads/followup-section'
import { ChecklistSection } from '@/components/leads/checklist-section'
import { MoveStageModal } from '@/components/leads/move-stage-modal'
import {
  formatDateTime,
  formatRelativeDate,
  getEtapaColor,
  getEtapaLabel,
  getWhatsAppLink,
  formatWhatsApp,
  calcularTempoResposta,
  formatCurrency,
} from '@/lib/utils'
import { useAuth } from '@/hooks/use-auth'
import type { Lead, Followup, ScriptChecklistItem, LeadEtapaHistorico, EtapaLead, StatusCorreios } from '@/types'
import Link from 'next/link'

const STATUS_CORREIOS_LABEL: Record<string, string> = {
  aguardando_rastreio: '⏳ Aguardando rastreio',
  postado: '📦 Postado',
  em_transito: '🚚 Em trânsito',
  disponivel_retirada: '🔔 Disponível para retirada',
  retirado: '✅ Retirado',
  devolvido: '↩️ Devolvido',
}

function CorreiosPanel({ lead, onUpdated }: { lead: Lead; onUpdated: () => void }) {
  const [codigoRastreio, setCodigoRastreio] = useState(lead.codigoRastreio || '')
  const [salvando, setSalvando] = useState(false)
  const [editando, setEditando] = useState(false)

  const salvarRastreio = async () => {
    setSalvando(true)
    try {
      await fetch(`/api/leads/${lead.id}/correios`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codigoRastreio }),
      })
      setEditando(false)
      onUpdated()
    } finally {
      setSalvando(false)
    }
  }

  const atualizarStatus = async (status: StatusCorreios) => {
    setSalvando(true)
    try {
      await fetch(`/api/leads/${lead.id}/correios`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusCorreios: status }),
      })
      onUpdated()
    } finally {
      setSalvando(false)
    }
  }

  const statusAtual = lead.statusCorreios || 'aguardando_rastreio'
  const prazoVencido = lead.prazoRastreioAt && new Date(lead.prazoRastreioAt) < new Date()

  return (
    <div className="p-4 bg-sky-50 rounded-lg border border-sky-200 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">📦</span>
        <h4 className="font-semibold text-sky-900">Controle de Correios</h4>
        <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 font-medium">
          {STATUS_CORREIOS_LABEL[statusAtual] || statusAtual}
        </span>
      </div>

      {/* Código de rastreio */}
      <div>
        <label className="text-xs text-sky-700 font-medium block mb-1">Código de Rastreio</label>
        {editando ? (
          <div className="flex gap-2">
            <input
              value={codigoRastreio}
              onChange={(e) => setCodigoRastreio(e.target.value.toUpperCase())}
              placeholder="Ex: AA123456789BR"
              className="flex-1 text-sm border border-sky-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-400 uppercase"
            />
            <button onClick={salvarRastreio} disabled={salvando || !codigoRastreio} className="text-sm px-3 py-1.5 bg-sky-600 text-white rounded-lg hover:bg-sky-700 disabled:opacity-50">
              {salvando ? '...' : 'Salvar'}
            </button>
            <button onClick={() => setEditando(false)} className="text-sm px-3 py-1.5 text-gray-600 hover:text-gray-800">Cancelar</button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono font-medium text-sky-900">
              {lead.codigoRastreio || <span className="text-sky-500 italic">Não inserido ainda</span>}
            </span>
            {lead.codigoRastreio && (
              <a href={`https://rastreamento.correios.com.br/app/index.php?objetos=${lead.codigoRastreio}`} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 underline">
                Rastrear ↗
              </a>
            )}
            <button onClick={() => setEditando(true)} className="text-xs text-sky-600 hover:text-sky-800 underline ml-auto">
              {lead.codigoRastreio ? 'Alterar' : 'Inserir código'}
            </button>
          </div>
        )}
        {!lead.codigoRastreio && (
          <p className="text-xs text-orange-600 mt-1">⚠️ Insira o código de rastreio em até 3 dias úteis após a postagem.</p>
        )}
        {prazoVencido && !lead.codigoRastreio && (
          <p className="text-xs text-red-600 mt-1 font-medium">🔴 Prazo vencido! Insira o código imediatamente.</p>
        )}
      </div>

      {/* Atualizar status */}
      {lead.codigoRastreio && statusAtual !== 'retirado' && statusAtual !== 'devolvido' && (
        <div>
          <label className="text-xs text-sky-700 font-medium block mb-1">Atualizar status</label>
          <div className="flex flex-wrap gap-2">
            {statusAtual !== 'disponivel_retirada' && (
              <button onClick={() => atualizarStatus('disponivel_retirada')} disabled={salvando} className="text-xs px-3 py-1.5 bg-yellow-100 text-yellow-800 border border-yellow-300 rounded-lg hover:bg-yellow-200 disabled:opacity-50">
                🔔 Disponível p/ retirada
              </button>
            )}
            <button onClick={() => atualizarStatus('retirado')} disabled={salvando} className="text-xs px-3 py-1.5 bg-green-100 text-green-800 border border-green-300 rounded-lg hover:bg-green-200 disabled:opacity-50">
              ✅ Retirado → Comprou
            </button>
            <button onClick={() => atualizarStatus('devolvido')} disabled={salvando} className="text-xs px-3 py-1.5 bg-red-100 text-red-800 border border-red-300 rounded-lg hover:bg-red-200 disabled:opacity-50">
              ↩️ Devolvido → Voltou
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default function LeadDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuth()
  const [lead, setLead] = useState<Lead | null>(null)
  const [loading, setLoading] = useState(true)
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [etapaDestino, setEtapaDestino] = useState<EtapaLead>('chamar_depois')
  const [activeTab, setActiveTab] = useState<'info' | 'followups' | 'checklist' | 'historico'>('info')
  const [editingInfo, setEditingInfo] = useState(false)
  const [editForm, setEditForm] = useState({ nomeCliente: '', whatsapp: '', observacoes: '' })
  const [editSaving, setEditSaving] = useState(false)
  const [agendandoData, setAgendandoData] = useState(false)
  const [novaDataAgendamento, setNovaDataAgendamento] = useState('')
  const [salvandoAgendamento, setSalvandoAgendamento] = useState(false)

  const fetchLead = async () => {
    try {
      const res = await fetch(`/api/leads/${id}`)
      if (res.ok) {
        const data = await res.json()
        setLead(data.lead)
      } else if (res.status === 404) {
        router.push('/leads')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLead() }, [id])

  const handleFollowupAdded = (fu: Followup) => {
    setLead((prev) => {
      if (!prev) return prev
      return { ...prev, followups: [...(prev.followups || []), fu] }
    })
  }

  const handlePrimeiraResposta = () => {
    fetchLead()
  }

  const handleChecklistUpdated = (item: ScriptChecklistItem) => {
    setLead((prev) => {
      if (!prev) return prev
      const items = prev.checklistItems || []
      const idx = items.findIndex((i) => i.item === item.item)
      if (idx >= 0) {
        const updated = [...items]
        updated[idx] = item
        return { ...prev, checklistItems: updated }
      }
      return { ...prev, checklistItems: [...items, item] }
    })
  }

  const handleStartEdit = () => {
    if (!lead) return
    setEditForm({
      nomeCliente: lead.nomeCliente,
      whatsapp: lead.whatsapp,
      observacoes: lead.observacoes || '',
    })
    setEditingInfo(true)
  }

  const handleSaveEdit = async () => {
    if (!lead) return
    setEditSaving(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomeCliente: editForm.nomeCliente.trim(),
          whatsapp: editForm.whatsapp.trim().replace(/\D/g, ''),
          observacoes: editForm.observacoes.trim(),
        }),
      })
      if (res.ok) {
        await fetchLead()
        setEditingInfo(false)
      }
    } finally {
      setEditSaving(false)
    }
  }

  const handleSalvarAgendamento = async () => {
    if (!lead || !novaDataAgendamento) return
    setSalvandoAgendamento(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agendadoPara: new Date(novaDataAgendamento).toISOString() }),
      })
      if (res.ok) {
        await fetchLead()
        setAgendandoData(false)
        setNovaDataAgendamento('')
      }
    } finally {
      setSalvandoAgendamento(false)
    }
  }

  const handleStageMoved = async (data: any) => {
    if (!lead) return
    await fetch(`/api/leads/${lead.id}/etapa`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ etapa: etapaDestino, ...data }),
    })
    fetchLead()
    setShowMoveModal(false)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!lead) return null

  const totalFollowups = lead.followups?.length || 0
  const isAtrasado = lead.etapa === 'chamar_depois' && lead.agendadoPara && new Date(lead.agendadoPara) < new Date()
  const isElegivelGeladeira = totalFollowups >= 8 && lead.statusLead === 'ativo' && lead.etapa !== 'geladeira'

  return (
    <div>
      <Header
        title=""
        left={
          <Link href="/kanban" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </Link>
        }
      />

      <div className="p-4 lg:p-6 max-w-4xl mx-auto space-y-4">
        {/* Lead Header Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-xl font-bold text-gray-900">{lead.nomeCliente}</h1>
                <Badge className={getEtapaColor(lead.etapa)}>{getEtapaLabel(lead.etapa)}</Badge>
                {isAtrasado && <Badge variant="danger">Atrasado</Badge>}
                {isElegivelGeladeira && <Badge variant="warning">Elegível p/ Geladeira</Badge>}
                {totalFollowups >= 6 && totalFollowups < 8 && (
                  <Badge variant="warning">{totalFollowups} follow-ups</Badge>
                )}
              </div>

              <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                <a
                  href={getWhatsAppLink(lead.whatsapp)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-green-600 hover:text-green-700 font-medium"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                  </svg>
                  {formatWhatsApp(lead.whatsapp)}
                </a>
                <a
                  href={`tel:+${lead.whatsapp.replace(/\D/g, '')}`}
                  className="flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-medium"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Ligar
                </a>
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  {lead.produto?.nome || 'Produto não definido'}
                </span>
                {lead.vendedor && (user?.role === 'gestor' || user?.role === 'diretor') && (
                  <span className="flex items-center gap-1.5">
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    {lead.vendedor.nome}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={etapaDestino}
                onChange={(e) => setEtapaDestino(e.target.value as EtapaLead)}
                className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="fez_contato">Fez Contato</option>
                <option value="apresentacao">Apresentação</option>
                <option value="proposta_enviada">Proposta Enviada</option>
                <option value="negociacao">Negociação</option>
                <option value="chamar_depois">Chamar Depois</option>
                <option value="correios">Correios</option>
                <option value="comprou">Comprou</option>
                <option value="voltou">Voltou</option>
                <option value="desqualificado">Desqualificado</option>
                <option value="geladeira">Geladeira</option>
              </select>
              <Button onClick={() => setShowMoveModal(true)} variant="primary" size="sm">
                Mover
              </Button>
            </div>
          </div>

          {/* Quick stats */}
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Chegou</p>
              <p className="text-sm font-medium text-gray-900">{formatRelativeDate(lead.chegouEm)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">1ª Resposta</p>
              <p className="text-sm font-medium text-gray-900">
                {lead.primeiraRespostaEm
                  ? calcularTempoResposta(lead.chegouEm, lead.primeiraRespostaEm)
                  : <span className="text-gray-400">—</span>}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Follow-ups</p>
              <p className={`text-sm font-bold ${totalFollowups >= 8 ? 'text-red-600' : totalFollowups >= 6 ? 'text-yellow-600' : 'text-gray-900'}`}>
                {totalFollowups}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Origem</p>
              <p className="text-sm font-medium text-gray-900 capitalize">
                {lead.origem === 'rastreado' ? '🎯 Rastreado' : '📱 Não rastreado'}
              </p>
            </div>
          </div>

          {/* Alerts */}
          {/* Agendamento — editável diretamente */}
          <div className={`mt-3 p-3 rounded-lg border ${isAtrasado ? 'bg-red-50 border-red-200' : lead.agendadoPara ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}>
            {agendandoData ? (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-gray-700">📅 Agendar para:</span>
                <input
                  type="datetime-local"
                  value={novaDataAgendamento}
                  onChange={(e) => setNovaDataAgendamento(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-green-400"
                />
                <button
                  onClick={handleSalvarAgendamento}
                  disabled={salvandoAgendamento || !novaDataAgendamento}
                  className="text-sm px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {salvandoAgendamento ? '...' : 'Salvar'}
                </button>
                <button
                  onClick={() => { setAgendandoData(false); setNovaDataAgendamento('') }}
                  className="text-sm px-3 py-1 text-gray-600 hover:text-gray-800"
                >
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <p className={`text-sm font-medium ${isAtrasado ? 'text-red-800' : lead.agendadoPara ? 'text-blue-800' : 'text-gray-500'}`}>
                  {isAtrasado ? '🔴 Chamada atrasada — ' : lead.agendadoPara ? '📅 Agendado: ' : '📅 Sem agendamento'}
                  {lead.agendadoPara && formatDateTime(lead.agendadoPara)}
                </p>
                <button
                  onClick={() => {
                    setAgendandoData(true)
                    if (lead.agendadoPara) {
                      const d = new Date(lead.agendadoPara)
                      const pad = (n: number) => String(n).padStart(2, '0')
                      setNovaDataAgendamento(`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`)
                    }
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium underline"
                >
                  {lead.agendadoPara ? 'Alterar' : 'Agendar'}
                </button>
              </div>
            )}
          </div>

          {lead.etapa === 'comprou' && lead.valorBruto && (
            <div className="mt-3 p-3 rounded-lg border bg-green-50 border-green-200">
              <p className="text-sm text-green-800">
                ✅ Venda registrada — Bruto: <strong>{formatCurrency(lead.valorBruto)}</strong>
                {lead.valorLiquido && <> | Líquido: <strong>{formatCurrency(lead.valorLiquido)}</strong></>}
              </p>
              {lead.observacaoVenda && <p className="text-xs text-green-700 mt-1">{lead.observacaoVenda}</p>}
            </div>
          )}

          {lead.etapa === 'desqualificado' && lead.motivoDesqualificacao && (
            <div className="mt-3 p-3 rounded-lg border bg-red-50 border-red-200">
              <p className="text-sm text-red-800">
                ❌ Desqualificado — {lead.motivoDesqualificacao.replace(/_/g, ' ')}
                {lead.motivoDesqualificacaoOutro && `: ${lead.motivoDesqualificacaoOutro}`}
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { id: 'info', label: 'Informações' },
            { id: 'followups', label: `Follow-ups (${totalFollowups})` },
            { id: 'checklist', label: 'Script' },
            { id: 'historico', label: 'Histórico' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          {activeTab === 'info' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900">Dados do Lead</h3>
                {!editingInfo ? (
                  <button
                    onClick={handleStartEdit}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Editar
                  </button>
                ) : (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingInfo(false)}
                      disabled={editSaving}
                      className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      disabled={editSaving}
                      className="text-sm text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 px-3 py-1.5 rounded-lg font-medium"
                    >
                      {editSaving ? 'Salvando...' : '✓ Salvar'}
                    </button>
                  </div>
                )}
              </div>

              {editingInfo ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Nome do Cliente</label>
                    <input
                      value={editForm.nomeCliente}
                      onChange={(e) => setEditForm((f) => ({ ...f, nomeCliente: e.target.value }))}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">WhatsApp</label>
                    <input
                      value={editForm.whatsapp}
                      onChange={(e) => setEditForm((f) => ({ ...f, whatsapp: e.target.value }))}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
                      placeholder="Ex: 65991001001"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="text-xs text-gray-500 uppercase tracking-wide block mb-1">Observações</label>
                    <textarea
                      value={editForm.observacoes}
                      onChange={(e) => setEditForm((f) => ({ ...f, observacoes: e.target.value }))}
                      rows={3}
                      className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400 resize-none"
                      placeholder="Anotações sobre o lead..."
                    />
                  </div>
                </div>
              ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Cliente</label>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{lead.nomeCliente}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">WhatsApp</label>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{formatWhatsApp(lead.whatsapp)}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Produto</label>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{lead.produto?.nome || '—'}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Origem</label>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {lead.origem === 'rastreado' ? 'Rastreado (Meta Ads)' : 'Não rastreado'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Dentro da janela</label>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {lead.dentroJanela ? '✅ Sim' : '❌ Fora do horário'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Status</label>
                  <p className="text-sm font-medium text-gray-900 mt-0.5 capitalize">{lead.statusLead}</p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Chegou em</label>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDateTime(lead.chegouEm)}</p>
                </div>
                {lead.primeiraRespostaEm && (
                  <div>
                    <label className="text-xs text-gray-500 uppercase tracking-wide">Primeira resposta</label>
                    <p className="text-sm font-medium text-gray-900 mt-0.5">{formatDateTime(lead.primeiraRespostaEm)}</p>
                  </div>
                )}
              </div>
              )}
              {!editingInfo && lead.observacoes && (
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Observações</label>
                  <p className="text-sm text-gray-700 mt-1 p-3 bg-gray-50 rounded-lg">{lead.observacoes}</p>
                </div>
              )}

              {/* Correios info */}
              {lead.etapa === 'correios' && (
                <CorreiosPanel lead={lead} onUpdated={fetchLead} />
              )}

              {/* Geladeira info */}
              {lead.etapa === 'geladeira' && lead.entadaGeladeira && (
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-sm font-medium text-slate-800 mb-1">Informações da Geladeira</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                    <span>Entrou: {formatDateTime(lead.entadaGeladeira)}</span>
                    {lead.proximaReativacao && (
                      <span>Próxima reativação: {formatDateTime(lead.proximaReativacao)}</span>
                    )}
                    <span>Tentativas: {lead.tentativasReativacao}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'followups' && (
            <FollowupSection
              leadId={lead.id}
              followups={lead.followups || []}
              hasPrimeiraResposta={!!lead.primeiraRespostaEm}
              onAdded={handleFollowupAdded}
              onPrimeiraResposta={handlePrimeiraResposta}
            />
          )}

          {activeTab === 'checklist' && (
            <ChecklistSection
              leadId={lead.id}
              items={lead.checklistItems || []}
              onUpdated={handleChecklistUpdated}
            />
          )}

          {activeTab === 'historico' && (
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-900">Histórico de Etapas</h3>
              {(lead.historicoEtapas || []).length === 0 ? (
                <p className="text-sm text-gray-500 py-4 text-center">Nenhum histórico de mudança de etapa.</p>
              ) : (
                <div className="space-y-2">
                  {(lead.historicoEtapas || []).map((h: LeadEtapaHistorico, idx: number) => (
                    <div key={h.id} className="flex gap-3 items-start">
                      <div className="flex-shrink-0 w-2 h-2 rounded-full bg-green-500 mt-2" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          {h.etapaAnterior && (
                            <>
                              <Badge className={getEtapaColor(h.etapaAnterior)} size="sm">
                                {getEtapaLabel(h.etapaAnterior)}
                              </Badge>
                              <span className="text-gray-400 text-xs">→</span>
                            </>
                          )}
                          <Badge className={getEtapaColor(h.etapaNova)} size="sm">
                            {getEtapaLabel(h.etapaNova)}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(h.mudadoEm)}</p>
                        {h.observacao && <p className="text-xs text-gray-600 mt-0.5">{h.observacao}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showMoveModal && lead && (
        <MoveStageModal
          isOpen={showMoveModal}
          onClose={() => setShowMoveModal(false)}
          onConfirm={handleStageMoved}
          etapaDestino={etapaDestino}
          leadNome={lead.nomeCliente}
          followupCount={lead.followups?.length || 0}
        />
      )}
    </div>
  )
}
