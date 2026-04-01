'use client'

import { useState, useEffect } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import type { Produto } from '@/types'

interface NewLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onCreated: (lead: any) => void
}

export function NewLeadModal({ isOpen, onClose, onCreated }: NewLeadModalProps) {
  const [loading, setLoading] = useState(false)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [form, setForm] = useState({
    nomeCliente: '',
    whatsapp: '',
    produtoId: '',
    origem: 'nao_rastreado',
    observacoes: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/produtos').then((r) => r.json()).then((d) => setProdutos(d.produtos || []))
  }, [])

  const handleSubmit = async () => {
    if (!form.nomeCliente || !form.whatsapp) {
      setError('Nome e WhatsApp são obrigatórios')
      return
    }

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Erro ao criar lead')
        return
      }

      onCreated(data.lead)
      setForm({ nomeCliente: '', whatsapp: '', produtoId: '', origem: 'nao_rastreado', observacoes: '' })
      onClose()
    } catch {
      setError('Erro de conexão')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Novo Lead"
      size="md"
      footer={
        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button onClick={handleSubmit} loading={loading}>Criar Lead</Button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
            {error}
          </div>
        )}

        <Input
          label="Nome do Cliente"
          value={form.nomeCliente}
          onChange={(e) => setForm({ ...form, nomeCliente: e.target.value })}
          placeholder="Ex: Fazenda Boa Vista"
          required
        />

        <Input
          label="WhatsApp"
          value={form.whatsapp}
          onChange={(e) => setForm({ ...form, whatsapp: e.target.value })}
          placeholder="65999001001"
          required
        />

        <Select
          label="Produto"
          value={form.produtoId}
          onChange={(e) => setForm({ ...form, produtoId: e.target.value })}
          options={produtos.map((p) => ({ value: p.id, label: p.nome }))}
          placeholder="Selecione um produto"
        />

        <Select
          label="Origem"
          value={form.origem}
          onChange={(e) => setForm({ ...form, origem: e.target.value })}
          options={[
            { value: 'rastreado', label: 'Rastreado (anúncio)' },
            { value: 'nao_rastreado', label: 'Não rastreado (orgânico)' },
          ]}
        />

        <Textarea
          label="Observações"
          value={form.observacoes}
          onChange={(e) => setForm({ ...form, observacoes: e.target.value })}
          placeholder="Informações adicionais sobre o lead..."
          rows={2}
        />
      </div>
    </Modal>
  )
}
