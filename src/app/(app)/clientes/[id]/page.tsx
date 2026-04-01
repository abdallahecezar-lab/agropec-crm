'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { Input, Textarea } from '@/components/ui/input'
import {
  formatDateTime,
  formatRelativeDate,
  formatCurrency,
  getWhatsAppLink,
  formatWhatsApp,
  getStatusCarteira,
  getRecompraStatus,
} from '@/lib/utils'
import type { Cliente, ContatoCliente } from '@/types'
import Link from 'next/link'

const TIPOS_CONTATO = [
  { value: 'pos_venda', label: 'Pós-venda' },
  { value: 'recompra', label: 'Recompra' },
  { value: 'promocao', label: 'Promoção' },
  { value: 'ligacao', label: 'Ligação' },
  { value: 'whatsapp_texto', label: 'WhatsApp texto' },
  { value: 'whatsapp_audio', label: 'WhatsApp áudio' },
  { value: 'relacionamento', label: 'Relacionamento' },
  { value: 'lembrete_reposicao', label: 'Lembrete de reposição' },
]

const RESULTADOS_CONTATO = [
  { value: 'respondeu', label: 'Respondeu' },
  { value: 'nao_respondeu', label: 'Não respondeu' },
  { value: 'demonstrou_interesse', label: 'Demonstrou interesse' },
  { value: 'pediu_retorno', label: 'Pediu retorno' },
  { value: 'comprou', label: 'Comprou' },
  { value: 'sem_interesse', label: 'Sem interesse' },
]

const resultadoColors: Record<string, string> = {
  respondeu: 'bg-blue-100 text-blue-800',
  nao_respondeu: 'bg-gray-100 text-gray-600',
  demonstrou_interesse: 'bg-yellow-100 text-yellow-800',
  pediu_retorno: 'bg-purple-100 text-purple-800',
  comprou: 'bg-green-100 text-green-800',
  sem_interesse: 'bg-red-100 text-red-800',
}

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [cliente, setCliente] = useState<Cliente | null>(null)
  const [contatos, setContatos] = useState<ContatoCliente[]>([])
  const [loading, setLoading] = useState(true)
  const [showContatoModal, setShowContatoModal] = useState(false)
  const [savingContato, setSavingContato] = useState(false)
  const [formContato, setFormContato] = useState({
    tipo: 'whatsapp_texto',
    resultado: 'respondeu',
    observacao: '',
  })
  const [formError, setFormError] = useState('')

  const fetchData = async () => {
    try {
      const [clienteRes, contatosRes] = await Promise.all([
        fetch(`/api/clientes/${id}`),
        fetch(`/api/clientes/${id}/contatos`),
      ])

      if (!clienteRes.ok) { router.push('/clientes'); return }

      const clienteData = await clienteRes.json()
      const contatosData = await contatosRes.json()

      setCliente(clienteData.cliente)
      setContatos(contatosData.contatos || [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [id])

  const handleAddContato = async () => {
    if (!formContato.tipo || !formContato.resultado) {
      setFormError('Preencha todos os campos obrigatórios')
      return
    }

    setSavingContato(true)
    setFormError('')

    try {
      const res = await fetch(`/api/clientes/${id}/contatos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formContato),
      })

      if (res.ok) {
        const data = await res.json()
        setContatos((prev) => [data.contato, ...prev])
        setShowContatoModal(false)
        setFormContato({ tipo: 'whatsapp_texto', resultado: 'respondeu', observacao: '' })
        fetchData() // refresh to update last contact
      } else {
        const data = await res.json()
        setFormError(data.error || 'Erro ao registrar contato')
      }
    } finally {
      setSavingContato(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  if (!cliente) return null

  const statusCarteira = getStatusCarteira(contatos)
  const mesAtual = new Date()
  const inicio = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1)
  const contatosMes = contatos.filter((c) => new Date(c.dataContato) >= inicio).length

  const recompraStatus = cliente.ultimoProduto
    ? getRecompraStatus(cliente.dataUltimaCompra, cliente.ultimoProduto.cicloRecompraDias)
    : null

  const statusColors = {
    vermelho: 'bg-red-50 border-red-200',
    amarelo: 'bg-yellow-50 border-yellow-200',
    verde: 'bg-green-50 border-green-200',
  }
  const statusLabels = {
    vermelho: '🔴 Sem contato este mês — URGENTE',
    amarelo: '🟡 1 contato este mês — Mínimo atingido',
    verde: '🟢 2+ contatos este mês — Ideal',
  }

  return (
    <div>
      <Header
        title=""
        left={
          <Link href="/clientes" className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Carteira
          </Link>
        }
      />

      <div className="p-4 lg:p-6 max-w-3xl mx-auto space-y-4">
        {/* Client header */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{cliente.nome}</h1>
              <a
                href={getWhatsAppLink(cliente.whatsapp)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-600 hover:text-green-700 text-sm font-medium flex items-center gap-1 mt-1"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                {formatWhatsApp(cliente.whatsapp)}
              </a>
            </div>
            <Button onClick={() => setShowContatoModal(true)} variant="primary">
              + Registrar Contato
            </Button>
          </div>

          {/* Status bar */}
          <div className={`mt-4 p-3 rounded-lg border ${statusColors[statusCarteira]}`}>
            <p className="text-sm font-medium">{statusLabels[statusCarteira]}</p>
            <p className="text-xs text-gray-600 mt-0.5">{contatosMes} contato(s) registrado(s) este mês</p>
          </div>

          {/* Recompra alert */}
          {recompraStatus && recompraStatus.status !== 'normal' && (
            <div className={`mt-2 p-3 rounded-lg border ${
              recompraStatus.status === 'vencido' ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'
            }`}>
              <p className={`text-sm font-medium ${
                recompraStatus.status === 'vencido' ? 'text-red-800' : 'text-orange-800'
              }`}>
                {recompraStatus.status === 'vencido'
                  ? `⚠️ Janela de recompra vencida há ${Math.abs(recompraStatus.diasRestantes)} dias`
                  : `🔔 Janela de recompra em ${recompraStatus.diasRestantes} dias`}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Produto: {cliente.ultimoProduto?.nome} — ciclo de {cliente.ultimoProduto?.cicloRecompraDias} dias
              </p>
            </div>
          )}

          {/* Stats grid */}
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-gray-500">Total acumulado</p>
              <p className="text-sm font-bold text-gray-900">{formatCurrency(cliente.valorTotalAcumulado)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Total compras</p>
              <p className="text-sm font-bold text-gray-900">{cliente.totalCompras}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Primeira compra</p>
              <p className="text-sm font-medium text-gray-900">{formatRelativeDate(cliente.dataPrimeiraCompra)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Última compra</p>
              <p className="text-sm font-medium text-gray-900">{formatRelativeDate(cliente.dataUltimaCompra)}</p>
            </div>
          </div>

          {cliente.proximaAcao && (
            <div className="mt-3 pt-3 border-t border-gray-100">
              <p className="text-xs text-gray-500">Próxima ação</p>
              <p className="text-sm text-gray-700 mt-0.5">{cliente.proximaAcao}</p>
            </div>
          )}
        </div>

        {/* Contact history */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-semibold text-gray-900 mb-4">Histórico de Contatos ({contatos.length})</h2>

          {contatos.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <p>Nenhum contato registrado.</p>
              <p className="text-sm mt-1">Registre o primeiro contato com este cliente.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {contatos.map((contato) => (
                <div key={contato.id} className="flex gap-3 p-3 rounded-lg border border-gray-100 bg-gray-50">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-sm">
                    💬
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-medium text-gray-900">
                        {TIPOS_CONTATO.find((t) => t.value === contato.tipo)?.label || contato.tipo}
                      </span>
                      <Badge className={resultadoColors[contato.resultado] || 'bg-gray-100 text-gray-700'}>
                        {RESULTADOS_CONTATO.find((r) => r.value === contato.resultado)?.label || contato.resultado}
                      </Badge>
                    </div>
                    {contato.observacao && (
                      <p className="text-sm text-gray-600">{contato.observacao}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDateTime(contato.dataContato)}
                      {contato.vendedor && ` · ${(contato.vendedor as any).nome}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add Contact Modal */}
      <Modal
        isOpen={showContatoModal}
        onClose={() => setShowContatoModal(false)}
        title="Registrar Contato"
      >
        <div className="space-y-4">
          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {formError}
            </div>
          )}
          <Select
            label="Tipo de contato *"
            value={formContato.tipo}
            onChange={(e) => setFormContato((p) => ({ ...p, tipo: e.target.value }))}
            options={TIPOS_CONTATO}
          />
          <Select
            label="Resultado *"
            value={formContato.resultado}
            onChange={(e) => setFormContato((p) => ({ ...p, resultado: e.target.value }))}
            options={RESULTADOS_CONTATO}
          />
          <Textarea
            label="Observação (opcional)"
            value={formContato.observacao}
            onChange={(e) => setFormContato((p) => ({ ...p, observacao: e.target.value }))}
            placeholder="Detalhes sobre o contato..."
            rows={3}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={handleAddContato} loading={savingContato} className="flex-1">
              Registrar
            </Button>
            <Button variant="outline" onClick={() => setShowContatoModal(false)} disabled={savingContato}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
