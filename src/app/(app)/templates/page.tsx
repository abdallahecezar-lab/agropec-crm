'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input, Textarea } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { Select } from '@/components/ui/select'
import { useAuth } from '@/hooks/use-auth'
import type { TemplateMensagem } from '@/types'

const CATEGORIAS = [
  { value: 'follow-up', label: 'Follow-up' },
  { value: 'geladeira', label: 'Geladeira' },
  { value: 'promocao', label: 'Promoção' },
  { value: 'pos-venda', label: 'Pós-venda' },
  { value: 'carteira', label: 'Carteira' },
  { value: 'reativacao', label: 'Reativação' },
]

const categoriaColors: Record<string, string> = {
  'follow-up': 'bg-blue-100 text-blue-800',
  'geladeira': 'bg-slate-100 text-slate-800',
  'promocao': 'bg-orange-100 text-orange-800',
  'pos-venda': 'bg-green-100 text-green-800',
  'carteira': 'bg-purple-100 text-purple-800',
  'reativacao': 'bg-yellow-100 text-yellow-800',
}

export default function TemplatesPage() {
  const { user } = useAuth()
  const [templates, setTemplates] = useState<TemplateMensagem[]>([])
  const [loading, setLoading] = useState(true)
  const [categoriaFilter, setCategoriaFilter] = useState('')
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<TemplateMensagem | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    nome: '',
    categoria: 'follow-up',
    conteudo: '',
    ativo: true,
  })

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/templates')
      if (res.ok) {
        const data = await res.json()
        setTemplates(data.templates || [])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTemplates() }, [])

  const handleCopy = async (template: TemplateMensagem) => {
    await navigator.clipboard.writeText(template.conteudo)
    setCopiedId(template.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const openNew = () => {
    setEditingTemplate(null)
    setForm({ nome: '', categoria: 'follow-up', conteudo: '', ativo: true })
    setError('')
    setShowModal(true)
  }

  const openEdit = (t: TemplateMensagem) => {
    setEditingTemplate(t)
    setForm({ nome: t.nome, categoria: t.categoria, conteudo: t.conteudo, ativo: t.ativo })
    setError('')
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.nome.trim() || !form.conteudo.trim()) {
      setError('Nome e conteúdo são obrigatórios')
      return
    }

    setSaving(true)
    setError('')
    try {
      const url = editingTemplate ? `/api/templates?id=${editingTemplate.id}` : '/api/templates'
      const method = editingTemplate ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })

      if (res.ok) {
        fetchTemplates()
        setShowModal(false)
      } else {
        const data = await res.json()
        setError(data.error || 'Erro ao salvar')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleToggleAtivo = async (t: TemplateMensagem) => {
    await fetch(`/api/templates?id=${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !t.ativo }),
    })
    fetchTemplates()
  }

  const filtered = templates.filter((t) => {
    const matchCat = !categoriaFilter || t.categoria === categoriaFilter
    const matchSearch = !search ||
      t.nome.toLowerCase().includes(search.toLowerCase()) ||
      t.conteudo.toLowerCase().includes(search.toLowerCase())
    return matchCat && matchSearch
  })

  return (
    <div>
      <Header title="Templates de Mensagem" />
      <div className="p-4 lg:p-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex-1 min-w-48">
            <Input
              placeholder="Buscar templates..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-40">
            <Select
              value={categoriaFilter}
              onChange={(e) => setCategoriaFilter(e.target.value)}
              options={[{ value: '', label: 'Todas as categorias' }, ...CATEGORIAS]}
            />
          </div>
          {user?.role === 'gestor' && (
            <Button onClick={openNew}>+ Novo Template</Button>
          )}
        </div>

        <div className="text-sm text-gray-500">
          <span className="font-medium text-gray-900">{filtered.length}</span> template(s)
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium">Nenhum template encontrado</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((template) => (
              <div
                key={template.id}
                className={`bg-white rounded-xl border p-4 flex flex-col ${
                  !template.ativo ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">{template.nome}</h3>
                    <Badge className={categoriaColors[template.categoria] || 'bg-gray-100 text-gray-700'} size="sm">
                      {CATEGORIAS.find((c) => c.value === template.categoria)?.label || template.categoria}
                    </Badge>
                  </div>
                  {!template.ativo && <Badge variant="default" size="sm">Inativo</Badge>}
                </div>

                <p className="text-sm text-gray-600 flex-1 line-clamp-4 whitespace-pre-wrap mb-3">
                  {template.conteudo}
                </p>

                <div className="flex gap-2 mt-auto pt-3 border-t border-gray-100">
                  <Button
                    size="sm"
                    variant={copiedId === template.id ? 'primary' : 'outline'}
                    onClick={() => handleCopy(template)}
                    className="flex-1"
                  >
                    {copiedId === template.id ? '✓ Copiado!' : '📋 Copiar'}
                  </Button>
                  {user?.role === 'gestor' && (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(template)}>
                        Editar
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleToggleAtivo(template)}>
                        {template.ativo ? 'Desativar' : 'Ativar'}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New/Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingTemplate ? 'Editar Template' : 'Novo Template'}
      >
        <div className="space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
          )}
          <Input
            label="Nome *"
            value={form.nome}
            onChange={(e) => setForm((p) => ({ ...p, nome: e.target.value }))}
            placeholder="Ex: Follow-up dia 2"
          />
          <Select
            label="Categoria *"
            value={form.categoria}
            onChange={(e) => setForm((p) => ({ ...p, categoria: e.target.value }))}
            options={CATEGORIAS}
          />
          <Textarea
            label="Conteúdo *"
            value={form.conteudo}
            onChange={(e) => setForm((p) => ({ ...p, conteudo: e.target.value }))}
            placeholder="Mensagem do template..."
            rows={6}
          />
          <div className="flex gap-3 pt-2">
            <Button variant="primary" onClick={handleSave} loading={saving} className="flex-1">
              {editingTemplate ? 'Salvar alterações' : 'Criar template'}
            </Button>
            <Button variant="outline" onClick={() => setShowModal(false)} disabled={saving}>
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
