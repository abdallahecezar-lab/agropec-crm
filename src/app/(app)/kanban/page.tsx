'use client'

import { useEffect, useState } from 'react'
import { Header } from '@/components/layout/header'
import { KanbanBoard } from '@/components/kanban/kanban-board'
import { NewLeadModal } from '@/components/leads/new-lead-modal'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import type { Lead } from '@/types'

export default function KanbanPage() {
  const { user } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewLead, setShowNewLead] = useState(false)

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/leads?limit=200')
      if (res.ok) {
        const data = await res.json()
        setLeads(data.leads)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLeads()
  }, [])

  return (
    <div className="flex flex-col h-full">
      <Header title="Kanban de Leads" />

      <div className="flex items-center justify-between px-4 lg:px-6 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span className="font-medium text-gray-900">{leads.filter(l => l.statusLead === 'ativo').length}</span>
          leads ativos
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={fetchLeads} disabled={loading}>
            <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Atualizar
          </Button>
          <Button size="sm" onClick={() => setShowNewLead(true)}>
            + Novo Lead
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-x-auto p-4 lg:p-6">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full" />
          </div>
        ) : (
          <KanbanBoard
            leadsIniciais={leads}
            onLeadMoved={() => fetchLeads()}
          />
        )}
      </div>

      <NewLeadModal
        isOpen={showNewLead}
        onClose={() => setShowNewLead(false)}
        onCreated={(newLead) => {
          setLeads((prev) => [newLead, ...prev])
          setShowNewLead(false)
        }}
      />
    </div>
  )
}
