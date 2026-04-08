'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatDateTime } from '@/lib/utils'
import type { Followup } from '@/types'

interface FollowupSectionProps {
  leadId: string
  followups: Followup[]
  hasPrimeiraResposta: boolean
  onAdded: (followup: Followup) => void
  onPrimeiraResposta?: () => void
}

export function FollowupSection({ leadId, followups, hasPrimeiraResposta, onAdded, onPrimeiraResposta }: FollowupSectionProps) {
  const [showForm, setShowForm] = useState(false)
  const [tipo, setTipo] = useState<'ligacao' | 'audio_whatsapp' | 'texto_whatsapp' | ''>('')
  const [observacao, setObservacao] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sugestao, setSugestao] = useState('')
  const [registrandoPrimeiraResposta, setRegistrandoPrimeiraResposta] = useState(false)

  const handleRegistrarPrimeiraResposta = async () => {
    setRegistrandoPrimeiraResposta(true)
    try {
      const res = await fetch(`/api/leads/${leadId}/primeira-resposta`, { method: 'POST' })
      if (res.ok) {
        onPrimeiraResposta?.()
      }
    } finally {
      setRegistrandoPrimeiraResposta(false)
    }
  }

  const handleAddFollowup = async () => {
    if (!tipo) {
      setError('Selecione o tipo de contato (Ligação, Áudio ou Texto)')
      return
    }
    setLoading(true)
    setError('')
    setSugestao('')

    try {
      const res = await fetch(`/api/leads/${leadId}/followups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo, observacao }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao registrar follow-up')
        return
      }

      onAdded(data.followup)
      setTipo('')
      setObservacao('')
      setShowForm(false)
      if (data.sugestao) setSugestao(data.sugestao)
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  const totalFollowups = followups.length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-gray-900">Follow-ups</h3>
          <Badge variant={totalFollowups >= 8 ? 'warning' : 'default'}>
            {totalFollowups}
          </Badge>
        </div>
        {hasPrimeiraResposta && (
          <Button size="sm" onClick={() => setShowForm(!showForm)} variant="outline">
            + Registrar
          </Button>
        )}
      </div>

      {/* Primeira resposta */}
      {!hasPrimeiraResposta && (
        <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-sm text-blue-800 mb-2">
            ℹ️ Registre a primeira resposta do cliente antes de adicionar follow-ups. O primeiro contato não é um follow-up.
          </p>
          <Button
            size="sm"
            variant="primary"
            loading={registrandoPrimeiraResposta}
            onClick={handleRegistrarPrimeiraResposta}
          >
            Registrar Primeira Resposta
          </Button>
        </div>
      )}

      {/* Geladeira suggestion */}
      {totalFollowups >= 8 && (
        <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <p className="text-sm text-yellow-800">
            ⚠️ Com {totalFollowups} follow-ups sem conversão, considere mover este lead para a <strong>Geladeira</strong>.
          </p>
        </div>
      )}

      {sugestao && (
        <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
          <p className="text-sm text-orange-800">{sugestao}</p>
        </div>
      )}

      {/* Add form */}
      {showForm && (
        <div className="p-4 bg-gray-50 rounded-lg border">
          {error && (
            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Tipo de contato — obrigatório */}
          <div className="mb-3">
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Tipo de contato <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {([
                { value: 'ligacao', label: '📞 Ligação' },
                { value: 'audio_whatsapp', label: '🎙️ Áudio' },
                { value: 'texto_whatsapp', label: '💬 Texto' },
              ] as const).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTipo(opt.value)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${
                    tipo === opt.value
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-green-400 hover:text-green-600'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <Textarea
            label={`Follow-up #${totalFollowups + 1} — Observação (opcional)`}
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Como foi o contato? O que o cliente disse?..."
            rows={2}
          />
          <div className="flex gap-2 mt-3">
            <Button size="sm" onClick={handleAddFollowup} loading={loading}>
              Registrar
            </Button>
            <Button size="sm" variant="ghost" onClick={() => { setShowForm(false); setTipo(''); setError('') }} disabled={loading}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      {followups.length === 0 && hasPrimeiraResposta && (
        <div className="text-center py-6 text-gray-500 text-sm">
          Nenhum follow-up registrado ainda.
        </div>
      )}

      <div className="space-y-2">
        {followups.map((fu) => (
          <div key={fu.id} className="flex gap-3 p-3 bg-white rounded-lg border border-gray-100">
            <div className="flex-shrink-0">
              <div className="w-7 h-7 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">
                {fu.numero}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <span className="text-xs font-medium text-gray-700">Follow-up #{fu.numero}</span>
                {fu.tipo && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                    {fu.tipo === 'ligacao' ? '📞 Ligação' : fu.tipo === 'audio_whatsapp' ? '🎙️ Áudio' : '💬 Texto'}
                  </span>
                )}
                <span className="text-xs text-gray-400">por {fu.vendedor?.nome}</span>
              </div>
              {fu.observacao && (
                <p className="text-sm text-gray-700">{fu.observacao}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">{formatDateTime(fu.registradoEm)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
