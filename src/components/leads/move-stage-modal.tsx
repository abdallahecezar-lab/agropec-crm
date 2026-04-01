'use client'

import { useState } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { MOTIVOS_DESQUALIFICACAO } from '@/lib/constants'
import type { EtapaLead } from '@/types'

interface MoveStageModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: any) => Promise<void>
  etapaDestino: EtapaLead
  leadNome: string
  followupCount: number
}

const etapaTitles: Record<string, string> = {
  chamar_depois: 'Chamar Depois',
  desqualificado: 'Desqualificado',
  comprou: 'Comprou',
  geladeira: 'Geladeira',
}

export function MoveStageModal({ isOpen, onClose, onConfirm, etapaDestino, leadNome, followupCount }: MoveStageModalProps) {
  const [loading, setLoading] = useState(false)
  const [agendadoPara, setAgendadoPara] = useState('')
  const [motivoDesqualificacao, setMotivoDesqualificacao] = useState('')
  const [motivoOutro, setMotivoOutro] = useState('')
  const [valorBruto, setValorBruto] = useState('')
  const [valorLiquido, setValorLiquido] = useState('')
  const [observacaoVenda, setObservacaoVenda] = useState('')
  const [observacao, setObservacao] = useState('')

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const data: any = { observacao }

      if (etapaDestino === 'chamar_depois') {
        if (!agendadoPara) {
          alert('Data/hora obrigatória')
          return
        }
        data.agendadoPara = new Date(agendadoPara).toISOString()
      }

      if (etapaDestino === 'desqualificado') {
        if (!motivoDesqualificacao) {
          alert('Motivo obrigatório')
          return
        }
        data.motivoDesqualificacao = motivoDesqualificacao
        if (motivoDesqualificacao === 'outro' || motivoDesqualificacao === 'nunca_respondeu_8_tentativas') {
          data.motivoDesqualificacaoOutro = motivoOutro
        }
      }

      if (etapaDestino === 'comprou') {
        data.valorBruto = valorBruto ? parseFloat(valorBruto) : null
        data.valorLiquido = valorLiquido ? parseFloat(valorLiquido) : null
        data.observacaoVenda = observacaoVenda
      }

      await onConfirm(data)
    } finally {
      setLoading(false)
    }
  }

  const motivosDisponiveis = MOTIVOS_DESQUALIFICACAO.filter(
    (m) => m.minFollowups <= followupCount
  )

  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
    return now.toISOString().slice(0, 16)
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Mover para: ${etapaTitles[etapaDestino] || etapaDestino}`}
      size="md"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} loading={loading}>
            Confirmar
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
          <strong>Lead:</strong> {leadNome}
        </div>

        {etapaDestino === 'chamar_depois' && (
          <div>
            <Input
              label="Data e Hora para Retorno"
              type="datetime-local"
              value={agendadoPara}
              onChange={(e) => setAgendadoPara(e.target.value)}
              min={getMinDateTime()}
              required
            />
            <p className="text-xs text-gray-500 mt-1">Obrigatório: defina quando deve retornar o contato</p>
          </div>
        )}

        {etapaDestino === 'desqualificado' && (
          <>
            <Select
              label="Motivo da Desqualificação"
              value={motivoDesqualificacao}
              onChange={(e) => setMotivoDesqualificacao(e.target.value)}
              options={motivosDisponiveis.map((m) => ({ value: m.id, label: m.label }))}
              placeholder="Selecione o motivo"
              required
            />
            {followupCount < 8 && (
              <div className="p-2 bg-yellow-50 rounded text-xs text-yellow-700">
                ⚠️ "Nunca respondeu após 8+ tentativas" requer pelo menos 8 follow-ups (atual: {followupCount})
              </div>
            )}
            {(motivoDesqualificacao === 'outro') && (
              <Input
                label="Especifique"
                value={motivoOutro}
                onChange={(e) => setMotivoOutro(e.target.value)}
                placeholder="Descreva o motivo"
              />
            )}
          </>
        )}

        {etapaDestino === 'comprou' && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Valor Bruto (R$)"
                type="number"
                value={valorBruto}
                onChange={(e) => setValorBruto(e.target.value)}
                placeholder="0,00"
                min="0"
                step="0.01"
              />
              <Input
                label="Valor Líquido (R$)"
                type="number"
                value={valorLiquido}
                onChange={(e) => setValorLiquido(e.target.value)}
                placeholder="0,00"
                min="0"
                step="0.01"
              />
            </div>
            <Textarea
              label="Observação da Venda"
              value={observacaoVenda}
              onChange={(e) => setObservacaoVenda(e.target.value)}
              placeholder="Detalhes sobre a venda..."
              rows={2}
            />
            <div className="p-3 bg-green-50 rounded-lg text-sm text-green-800">
              ✅ O lead será convertido em cliente na carteira automaticamente.
            </div>
          </>
        )}

        {etapaDestino === 'geladeira' && (
          <div className="p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
            ❄️ O lead irá para a geladeira. Ele não é um cliente - é um lead frio que poderá ser reativado conforme a cadência (7, 15, 30 dias...).
          </div>
        )}

        <Textarea
          label="Observação (opcional)"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          placeholder="Observação sobre a mudança..."
          rows={2}
        />
      </div>
    </Modal>
  )
}
