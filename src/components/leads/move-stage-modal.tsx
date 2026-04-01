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
  correios: 'Correios (Pag. na Retirada)',
  voltou: 'Voltou (Não Retirou)',
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
  const [formaPagamento, setFormaPagamento] = useState<'pix' | 'cartao' | 'retirada'>('pix')
  const [observacao, setObservacao] = useState('')

  // Se destino é 'comprou' mas forma de pagamento é 'retirada',
  // na verdade o lead vai para 'correios'
  const etapaReal = (etapaDestino === 'comprou' && formaPagamento === 'retirada')
    ? 'correios'
    : etapaDestino

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const data: any = { observacao }

      if (etapaDestino === 'chamar_depois') {
        if (!agendadoPara) {
          alert('Data/hora obrigatória')
          setLoading(false)
          return
        }
        data.agendadoPara = new Date(agendadoPara).toISOString()
      }

      if (etapaDestino === 'desqualificado') {
        if (!motivoDesqualificacao) {
          alert('Motivo obrigatório')
          setLoading(false)
          return
        }
        data.motivoDesqualificacao = motivoDesqualificacao
        if (motivoDesqualificacao === 'outro' || motivoDesqualificacao === 'nunca_respondeu_8_tentativas') {
          data.motivoDesqualificacaoOutro = motivoOutro
        }
      }

      if (etapaDestino === 'comprou' || etapaDestino === 'correios') {
        data.valorBruto = valorBruto ? parseFloat(valorBruto) : null
        data.valorLiquido = valorLiquido ? parseFloat(valorLiquido) : null
        data.observacaoVenda = observacaoVenda
        data.formaPagamento = formaPagamento
        // redireciona para correios se pagamento na retirada
        data.etapa = etapaReal
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

  const isVenda = etapaDestino === 'comprou' || etapaDestino === 'correios'

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

        {isVenda && (
          <>
            {/* Forma de pagamento — só aparece quando destino é 'comprou' */}
            {etapaDestino === 'comprou' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Forma de Pagamento *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'pix', label: '💰 Pix', desc: 'Pagamento antecipado' },
                    { value: 'cartao', label: '💳 Cartão', desc: 'Link de crédito' },
                    { value: 'retirada', label: '📦 Correios', desc: 'Pag. na retirada' },
                  ].map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setFormaPagamento(opt.value as any)}
                      className={`p-3 rounded-lg border-2 text-center text-sm transition-all ${
                        formaPagamento === opt.value
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium">{opt.label}</div>
                      <div className="text-xs mt-0.5 opacity-70">{opt.desc}</div>
                    </button>
                  ))}
                </div>
                {formaPagamento === 'retirada' && (
                  <div className="mt-2 p-2 bg-sky-50 rounded text-xs text-sky-700 flex items-center gap-1.5">
                    📦 <span>Este lead irá para a aba <strong>Correios</strong> até o cliente retirar e pagar.</span>
                  </div>
                )}
              </div>
            )}

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
            {formaPagamento !== 'retirada' && etapaDestino === 'comprou' && (
              <div className="p-3 bg-green-50 rounded-lg text-sm text-green-800">
                ✅ O lead será convertido em cliente na carteira automaticamente.
              </div>
            )}
          </>
        )}

        {etapaDestino === 'voltou' && (
          <div className="p-3 bg-rose-50 rounded-lg text-sm text-rose-800">
            📦 O cliente não retirou o produto nos Correios. O valor da venda será <strong>descontado da meta do mês atual</strong>.
          </div>
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
