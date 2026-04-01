'use client'

import { useState, useEffect } from 'react'
import { formatRelativeDate } from '@/lib/utils'
import type { Notificacao } from '@/types'

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([])
  const [loading, setLoading] = useState(false)

  const unreadCount = notificacoes.filter((n) => !n.lida).length

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notificacoes')
      if (res.ok) {
        const data = await res.json()
        setNotificacoes(data.notificacoes || [])
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  const markAllRead = async () => {
    await fetch('/api/notificacoes', { method: 'PATCH', body: JSON.stringify({ all: true }), headers: { 'Content-Type': 'application/json' } })
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })))
  }

  const markRead = async (id: string) => {
    await fetch(`/api/notificacoes/${id}`, { method: 'PATCH' })
    setNotificacoes((prev) => prev.map((n) => n.id === id ? { ...n, lida: true } : n))
  }

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [])

  const getTipoLabel = (tipo: string) => {
    const map: Record<string, string> = {
      chamar_depois_atrasado: '⏰ Chamada atrasada',
      geladeira_reativar: '❄️ Reativar geladeira',
      carteira_sem_contato: '👥 Carteira sem contato',
      recompra_janela: '🔄 Janela de recompra',
    }
    return map[tipo] || tipo
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-white text-xs font-bold">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-40 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900 text-sm">Notificações</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-green-600 hover:text-green-700 font-medium"
                >
                  Marcar todas como lidas
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading && (
                <div className="p-4 text-center text-sm text-gray-500">Carregando...</div>
              )}
              {!loading && notificacoes.length === 0 && (
                <div className="p-8 text-center">
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  <p className="text-sm text-gray-500">Sem notificações</p>
                </div>
              )}
              {notificacoes.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.lida && markRead(n.id)}
                  className={`px-4 py-3 border-b border-gray-50 cursor-pointer transition-colors hover:bg-gray-50 ${!n.lida ? 'bg-green-50/50' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {!n.lida && (
                      <div className="w-2 h-2 rounded-full bg-green-500 mt-1.5 flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-500">{getTipoLabel(n.tipo)}</p>
                      <p className="text-sm text-gray-800 mt-0.5">{n.mensagem}</p>
                      <p className="text-xs text-gray-400 mt-1">{formatRelativeDate(n.criadoEm)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
