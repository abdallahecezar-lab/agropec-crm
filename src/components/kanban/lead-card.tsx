'use client'

import { useState, useRef } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Badge } from '@/components/ui/badge'
import { formatRelativeDate, formatWhatsApp, getWhatsAppLink } from '@/lib/utils'
import type { Lead } from '@/types'
import Link from 'next/link'

interface LeadCardProps {
  lead: Lead
  isDragging?: boolean
  onUpdated?: (lead: Lead) => void
}

export function LeadCard({ lead, isDragging, onUpdated }: LeadCardProps) {
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState(lead.nomeCliente)
  const [saving, setSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const saveName = async () => {
    const trimmed = nameValue.trim()
    if (!trimmed || trimmed === lead.nomeCliente) {
      setEditingName(false)
      setNameValue(lead.nomeCliente)
      return
    }
    setSaving(true)
    try {
      const res = await fetch(`/api/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nomeCliente: trimmed }),
      })
      if (res.ok) {
        const data = await res.json()
        onUpdated?.(data.lead)
        setNameValue(trimmed)
      }
    } finally {
      setSaving(false)
      setEditingName(false)
    }
  }
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: lead.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.4 : 1,
  }

  const followupCount = lead._count?.followups || lead.followups?.length || 0
  const checklistCount = lead._count?.checklistItems || lead.checklistItems?.length || 0
  const checklistConcluido = lead.checklistItems?.filter((i) => i.concluido).length || 0
  const checklistPct = checklistCount > 0 ? Math.round((checklistConcluido / 8) * 100) : 0

  const hoje = new Date()
  const estaAtrasado = lead.agendadoPara && new Date(lead.agendadoPara) < hoje
  const semPrimeiraResposta = !lead.primeiraRespostaEm

  // Destaque vermelho: sem contato há 3+ dias (lead ativo)
  const ultimoContatoEm =
    (lead.followups as any)?.[0]?.criadoEm
      ? new Date((lead.followups as any)[0].criadoEm)
      : lead.primeiraRespostaEm
        ? new Date(lead.primeiraRespostaEm)
        : null
  const diasSemContato = ultimoContatoEm
    ? Math.floor((hoje.getTime() - ultimoContatoEm.getTime()) / 86400000)
    : Math.floor((hoje.getTime() - new Date(lead.chegouEm).getTime()) / 86400000)
  const semContatoRecente = lead.statusLead === 'ativo' && diasSemContato >= 3

  const cardAlerta = estaAtrasado || semContatoRecente

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`bg-white rounded-lg border shadow-sm p-3 cursor-grab active:cursor-grabbing select-none transition-shadow ${
        isDragging ? 'shadow-lg ring-2 ring-green-500' : 'hover:shadow-md border-gray-200'
      } ${cardAlerta ? 'border-l-4 border-l-red-500 bg-red-50/40' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          {editingName ? (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                ref={inputRef}
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveName()
                  if (e.key === 'Escape') { setEditingName(false); setNameValue(lead.nomeCliente) }
                }}
                autoFocus
                disabled={saving}
                className="w-full text-sm font-medium text-gray-900 border border-green-400 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-green-400"
              />
              <div className="flex gap-2 mt-1">
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); saveName() }}
                  disabled={saving}
                  className="text-xs text-green-600 font-medium hover:text-green-800"
                >
                  {saving ? '...' : '✓ Salvar'}
                </button>
                <button
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { e.stopPropagation(); setEditingName(false); setNameValue(lead.nomeCliente) }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕ Cancelar
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1 group">
              <p className="font-medium text-sm text-gray-900 truncate">{nameValue}</p>
              <button
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => { e.stopPropagation(); setEditingName(true) }}
                className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-opacity"
                title="Editar nome"
              >
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </button>
            </div>
          )}
          {lead.produto && !editingName && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{lead.produto.nome}</p>
          )}
        </div>
        <div className="flex-shrink-0">
          {estaAtrasado && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
              ⏰ Atrasado
            </span>
          )}
          {!estaAtrasado && semContatoRecente && (
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-red-100 text-red-700">
              🔴 {diasSemContato}d
            </span>
          )}
        </div>
      </div>

      {/* WhatsApp */}
      <div className="flex items-center gap-1 mb-2">
        <svg className="w-3.5 h-3.5 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M11.947 0C5.35 0 0 5.35 0 11.947c0 2.09.547 4.066 1.502 5.777L0 24l6.472-1.697c1.637.893 3.507 1.411 5.475 1.411C18.544 23.714 24 18.364 24 11.767 24 5.17 18.544-.233 11.947 0z"/>
        </svg>
        <span className="text-xs text-gray-500">{formatWhatsApp(lead.whatsapp)}</span>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-1 mb-2">
        {followupCount === 0 && !semPrimeiraResposta && (
          <Badge variant="info" className="text-xs">0 FU</Badge>
        )}
        {followupCount >= 8 && (
          <Badge variant="warning" className="text-xs">⚠️ {followupCount} FU</Badge>
        )}
        {followupCount >= 6 && followupCount < 8 && (
          <Badge variant="warning" className="text-xs">{followupCount} FU</Badge>
        )}
        {followupCount > 0 && followupCount < 6 && (
          <Badge variant="default" className="text-xs">{followupCount} FU</Badge>
        )}

        {checklistPct > 0 && (
          <Badge variant={checklistPct >= 80 ? 'success' : 'default'} className="text-xs">
            ✓ {checklistPct}%
          </Badge>
        )}

        {lead.agendadoPara && !estaAtrasado && (
          <Badge variant="purple" className="text-xs">
            📅 {new Date(lead.agendadoPara).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
          </Badge>
        )}

        {semPrimeiraResposta && (
          <Badge variant="warning" className="text-xs">Sem 1ª resp.</Badge>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-gray-400">{formatRelativeDate(lead.chegouEm)}</span>
        <div className="flex items-center gap-1">
          <a
            href={getWhatsAppLink(lead.whatsapp)}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded hover:bg-green-50 text-green-600 transition-colors"
            title="Abrir WhatsApp"
          >
            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
            </svg>
          </a>
          <Link
            href={`/leads/${lead.id}`}
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded hover:bg-blue-50 text-blue-600 transition-colors"
            title="Ver detalhes"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </Link>
        </div>
      </div>
    </div>
  )
}
