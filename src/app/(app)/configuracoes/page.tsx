'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/use-auth'
import { useRouter } from 'next/navigation'

interface Config {
  janelaTrabalhInicio: string
  janelaTrabalhoFim: string
  metaMensalLiquida: string
  diasReativacaoGeladeira1: string
  diasReativacaoGeladeira2: string
  diasReativacaoGeladeira3: string
}

interface Produto {
  id: string
  nome: string
  cicloRecompraDias: number
  ativo: boolean
}

export default function ConfiguracoesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [config, setConfig] = useState<Config>({
    janelaTrabalhInicio: '08:00',
    janelaTrabalhoFim: '15:00',
    metaMensalLiquida: '21000',
    diasReativacaoGeladeira1: '7',
    diasReativacaoGeladeira2: '15',
    diasReativacaoGeladeira3: '30',
  })
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState('')
  const [newProduto, setNewProduto] = useState({ nome: '', cicloRecompraDias: 30 })
  const [savingProduto, setSavingProduto] = useState(false)
  const [produtoError, setProdutoError] = useState('')

  useEffect(() => {
    if (user && user.role !== 'gestor') {
      router.push('/dashboard')
      return
    }

    const fetchData = async () => {
      try {
        const [configRes, produtosRes] = await Promise.all([
          fetch('/api/configuracoes'),
          fetch('/api/produtos'),
        ])

        if (configRes.ok) {
          const data = await configRes.json()
          if (data.configuracoes) {
            const mapped: Partial<Config> = {}
            data.configuracoes.forEach((c: { chave: string; valor: string }) => {
              if (c.chave === 'janela_trabalho_inicio') mapped.janelaTrabalhInicio = c.valor
              if (c.chave === 'janela_trabalho_fim') mapped.janelaTrabalhoFim = c.valor
              if (c.chave === 'meta_mensal_liquida') mapped.metaMensalLiquida = c.valor
              if (c.chave === 'dias_reativacao_1') mapped.diasReativacaoGeladeira1 = c.valor
              if (c.chave === 'dias_reativacao_2') mapped.diasReativacaoGeladeira2 = c.valor
              if (c.chave === 'dias_reativacao_3') mapped.diasReativacaoGeladeira3 = c.valor
            })
            setConfig((prev) => ({ ...prev, ...mapped }))
          }
        }

        if (produtosRes.ok) {
          const data = await produtosRes.json()
          setProdutos(data.produtos || [])
        }
      } finally {
        setLoading(false)
      }
    }

    if (user) fetchData()
  }, [user])

  const handleSaveConfig = async () => {
    setSaving(true)
    setSavedMsg('')
    try {
      const updates = [
        { chave: 'janela_trabalho_inicio', valor: config.janelaTrabalhInicio },
        { chave: 'janela_trabalho_fim', valor: config.janelaTrabalhoFim },
        { chave: 'meta_mensal_liquida', valor: config.metaMensalLiquida },
        { chave: 'dias_reativacao_1', valor: config.diasReativacaoGeladeira1 },
        { chave: 'dias_reativacao_2', valor: config.diasReativacaoGeladeira2 },
        { chave: 'dias_reativacao_3', valor: config.diasReativacaoGeladeira3 },
      ]

      await fetch('/api/configuracoes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configuracoes: updates }),
      })

      setSavedMsg('Configurações salvas com sucesso!')
      setTimeout(() => setSavedMsg(''), 3000)
    } finally {
      setSaving(false)
    }
  }

  const handleAddProduto = async () => {
    if (!newProduto.nome.trim()) {
      setProdutoError('Nome é obrigatório')
      return
    }

    setSavingProduto(true)
    setProdutoError('')
    try {
      const res = await fetch('/api/produtos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduto),
      })

      if (res.ok) {
        const data = await res.json()
        setProdutos((prev) => [...prev, data.produto])
        setNewProduto({ nome: '', cicloRecompraDias: 30 })
      } else {
        const data = await res.json()
        setProdutoError(data.error || 'Erro ao criar produto')
      }
    } finally {
      setSavingProduto(false)
    }
  }

  const handleToggleProduto = async (produto: Produto) => {
    await fetch(`/api/produtos?id=${produto.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !produto.ativo }),
    })
    setProdutos((prev) => prev.map((p) => p.id === produto.id ? { ...p, ativo: !p.ativo } : p))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin w-10 h-10 border-4 border-green-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div>
      <Header title="Configurações" />
      <div className="p-4 lg:p-6 space-y-6 max-w-2xl mx-auto">
        {/* Work window */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Janela de Trabalho</h2>
          <p className="text-sm text-gray-500 mb-4">
            Define o horário padrão de atendimento. Leads que chegam dentro deste horário são marcados como "dentro da janela".
          </p>
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Início"
              type="time"
              value={config.janelaTrabalhInicio}
              onChange={(e) => setConfig((p) => ({ ...p, janelaTrabalhInicio: e.target.value }))}
            />
            <Input
              label="Fim"
              type="time"
              value={config.janelaTrabalhoFim}
              onChange={(e) => setConfig((p) => ({ ...p, janelaTrabalhoFim: e.target.value }))}
            />
          </div>
        </div>

        {/* Meta */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Meta Mensal</h2>
          <Input
            label="Meta de faturamento líquido (R$)"
            type="number"
            value={config.metaMensalLiquida}
            onChange={(e) => setConfig((p) => ({ ...p, metaMensalLiquida: e.target.value }))}
            placeholder="21000"
          />
          <p className="text-xs text-gray-500 mt-2">
            Usada para mostrar progresso e projeção no dashboard dos vendedores.
          </p>
        </div>

        {/* Geladeira reactivation cadence */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Cadência de Reativação (Geladeira)</h2>
          <p className="text-sm text-gray-500 mb-4">
            Dias para reativação após a entrada na geladeira.
          </p>
          <div className="grid grid-cols-3 gap-4">
            <Input
              label="1ª tentativa (dias)"
              type="number"
              value={config.diasReativacaoGeladeira1}
              onChange={(e) => setConfig((p) => ({ ...p, diasReativacaoGeladeira1: e.target.value }))}
            />
            <Input
              label="2ª tentativa (dias)"
              type="number"
              value={config.diasReativacaoGeladeira2}
              onChange={(e) => setConfig((p) => ({ ...p, diasReativacaoGeladeira2: e.target.value }))}
            />
            <Input
              label="3ª+ tentativa (dias)"
              type="number"
              value={config.diasReativacaoGeladeira3}
              onChange={(e) => setConfig((p) => ({ ...p, diasReativacaoGeladeira3: e.target.value }))}
            />
          </div>
        </div>

        {savedMsg && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
            ✅ {savedMsg}
          </div>
        )}

        <Button variant="primary" onClick={handleSaveConfig} loading={saving} className="w-full">
          Salvar configurações
        </Button>

        {/* Products */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">Produtos e Ciclos de Recompra</h2>

          <div className="space-y-2 mb-4">
            {produtos.map((produto) => (
              <div key={produto.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                produto.ativo ? 'bg-gray-50 border-gray-200' : 'bg-gray-100 border-gray-200 opacity-60'
              }`}>
                <div>
                  <span className="font-medium text-gray-900">{produto.nome}</span>
                  <span className="text-xs text-gray-500 ml-2">({produto.cicloRecompraDias} dias)</span>
                  {!produto.ativo && <span className="text-xs text-gray-400 ml-2">· inativo</span>}
                </div>
                <button
                  onClick={() => handleToggleProduto(produto)}
                  className="text-xs text-gray-500 hover:text-gray-700"
                >
                  {produto.ativo ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            ))}
            {produtos.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">Nenhum produto cadastrado.</p>
            )}
          </div>

          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm font-medium text-gray-700 mb-3">Adicionar produto</p>
            {produtoError && (
              <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {produtoError}
              </div>
            )}
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <Input
                  label="Nome do produto"
                  value={newProduto.nome}
                  onChange={(e) => setNewProduto((p) => ({ ...p, nome: e.target.value }))}
                  placeholder="Ex: Suplemento bovino 30kg"
                />
              </div>
              <div className="w-32">
                <Input
                  label="Ciclo (dias)"
                  type="number"
                  value={String(newProduto.cicloRecompraDias)}
                  onChange={(e) => setNewProduto((p) => ({ ...p, cicloRecompraDias: Number(e.target.value) }))}
                />
              </div>
              <Button onClick={handleAddProduto} loading={savingProduto} size="sm">
                Adicionar
              </Button>
            </div>
          </div>
        </div>

        {/* User credentials info */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4">
          <h3 className="font-medium text-blue-900 mb-2">Usuários de Acesso</h3>
          <p className="text-sm text-blue-700">
            Gerenciamento de usuários e senhas deve ser feito diretamente no banco de dados ou via script seed.
            Futuramente, esta tela permitirá criar e editar usuários.
          </p>
        </div>
      </div>
    </div>
  )
}
