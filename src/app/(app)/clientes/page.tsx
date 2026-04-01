'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuth } from '@/hooks/use-auth'
import {
  formatRelativeDate,
  formatCurrency,
  getWhatsAppLink,
  formatWhatsApp,
  getStatusCarteira,
} from '@/lib/utils'
import type { Cliente, ContatoCliente } from '@/types'
import Link from 'next/link'

interface ClienteComStatus extends Cliente {
  statusCarteira: 'vermelho' | 'amarelo' | 'verde'
  contatosMes: number
}

const statusColors = {
  vermelho: 'bg-red-100 text-red-800 border-red-200',
  amarelo: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  verde: 'bg-green-100 text-green-800 border-green-200',
}

const statusLabels = {
  vermelho: '🔴 Sem contato',
  amarelo: '🟡 Mínimo',
  verde: '🟢 Ideal',
}

export default function ClientesPage() {
  const { user } = useAuth()
  const [clientes, setClientes] = useState<ClienteComStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const fetchClientes = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/clientes')
      if (res.ok) {
        const data = await res.json()
        // Compute status for each client
        const enriched = data.clientes.map((c: Cliente & { contatos: ContatoCliente[] }) => {
          const status = getStatusCarteira(c.contatos || [])
          const mesAtual = new Date()
          const inicio = new Date(mesAtual.getFullYear(), mesAtual.getMonth(), 1)
          const contatosMes = (c.contatos || []).filter(
            (ct) => new Date(ct.dataContato) >= inicio
          ).length
          return { ...c, statusCarteira: status, contatosMes }
        })
        setClientes(enriched)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClientes() }, [])

  const filtered = clientes.filter((c) => {
    const matchSearch = !search ||
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.whatsapp.includes(search)
    const matchStatus = !statusFilter || c.statusCarteira === statusFilter
    return matchSearch && matchStatus
  })

  // Stats
  const semContato = clientes.filter((c) => c.statusCarteira === 'vermelho').length
  const minimo = clientes.filter((c) => c.statusCarteira === 'amarelo').length
  const ideal = clientes.filter((c) => c.statusCarteira === 'verde').length

  return (
    <div>
      <Header title="Carteira de Clientes" />
      <div className="p-4 lg:p-6 space-y-4">
        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setStatusFilter(statusFilter === 'vermelho' ? '' : 'vermelho')}
            className={`rounded-xl border p-4 text-left transition-all ${
              statusFilter === 'vermelho' ? 'ring-2 ring-red-400' : ''
            } bg-red-50 border-red-200`}
          >
            <p className="text-2xl font-bold text-red-700">{semContato}</p>
            <p className="text-xs text-red-600 mt-1">Sem contato este mês</p>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'amarelo' ? '' : 'amarelo')}
            className={`rounded-xl border p-4 text-left transition-all ${
              statusFilter === 'amarelo' ? 'ring-2 ring-yellow-400' : ''
            } bg-yellow-50 border-yellow-200`}
          >
            <p className="text-2xl font-bold text-yellow-700">{minimo}</p>
            <p className="text-xs text-yellow-600 mt-1">1 contato (mínimo)</p>
          </button>
          <button
            onClick={() => setStatusFilter(statusFilter === 'verde' ? '' : 'verde')}
            className={`rounded-xl border p-4 text-left transition-all ${
              statusFilter === 'verde' ? 'ring-2 ring-green-400' : ''
            } bg-green-50 border-green-200`}
          >
            <p className="text-2xl font-bold text-green-700">{ideal}</p>
            <p className="text-xs text-green-600 mt-1">2+ contatos (ideal)</p>
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 items-center flex-wrap">
          <div className="flex-1 min-w-48">
            <Input
              placeholder="Buscar por nome ou WhatsApp..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              leftIcon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              }
            />
          </div>
          {statusFilter && (
            <Button variant="ghost" size="sm" onClick={() => setStatusFilter('')}>
              Limpar filtro
            </Button>
          )}
        </div>

        <div className="text-sm text-gray-500">
          <span className="font-medium text-gray-900">{filtered.length}</span> cliente(s)
          {statusFilter && ` com status: ${statusLabels[statusFilter as keyof typeof statusLabels]}`}
        </div>

        {/* Client list */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <p className="font-medium">Nenhum cliente encontrado</p>
            <p className="text-sm mt-1">Os clientes aparecem aqui quando um lead é movido para "Comprou"</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((cliente) => (
              <Link key={cliente.id} href={`/clientes/${cliente.id}`}>
                <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-green-300 hover:shadow-sm transition-all cursor-pointer">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-gray-900">{cliente.nome}</h3>
                        <Badge className={statusColors[cliente.statusCarteira]}>
                          {statusLabels[cliente.statusCarteira]}
                        </Badge>
                      </div>

                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500">
                        <a
                          href={getWhatsAppLink(cliente.whatsapp)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-600 hover:text-green-700"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {formatWhatsApp(cliente.whatsapp)}
                        </a>
                        {cliente.ultimoProduto && (
                          <span>📦 {cliente.ultimoProduto.nome}</span>
                        )}
                        {user?.role === 'gestor' && cliente.vendedor && (
                          <span>👤 {(cliente.vendedor as any).nome}</span>
                        )}
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-bold text-gray-900">{formatCurrency(cliente.valorTotalAcumulado)}</p>
                      <p className="text-xs text-gray-500">{cliente.totalCompras} compra(s)</p>
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                    <span>
                      Último contato:{' '}
                      <span className={`font-medium ${!cliente.ultimoContato ? 'text-red-600' : 'text-gray-700'}`}>
                        {cliente.ultimoContato ? formatRelativeDate(cliente.ultimoContato) : 'Nunca'}
                      </span>
                    </span>
                    <span>
                      Contatos este mês:{' '}
                      <span className={`font-medium ${
                        cliente.contatosMes === 0 ? 'text-red-600' :
                        cliente.contatosMes === 1 ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {cliente.contatosMes}
                      </span>
                    </span>
                    <span>Primeira compra: {formatRelativeDate(cliente.dataPrimeiraCompra)}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
