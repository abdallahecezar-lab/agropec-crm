'use client'

import { useState, useCallback } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
} from '@dnd-kit/core'
import { KanbanColumn } from './kanban-column'
import { LeadCard } from './lead-card'
import { MoveStageModal } from '@/components/leads/move-stage-modal'
import { ETAPAS_LEAD } from '@/lib/constants'
import type { Lead, EtapaLead } from '@/types'

interface KanbanBoardProps {
  leadsIniciais: Lead[]
  onLeadMoved?: (leadId: string, etapa: EtapaLead) => void
}

interface MoveModalState {
  isOpen: boolean
  leadId: string
  etapaDestino: EtapaLead | null
  leadNome: string
  followupCount: number
}

export function KanbanBoard({ leadsIniciais, onLeadMoved }: KanbanBoardProps) {
  const [leads, setLeads] = useState<Lead[]>(leadsIniciais)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [overColumnId, setOverColumnId] = useState<string | null>(null)
  const [moveModal, setMoveModal] = useState<MoveModalState>({
    isOpen: false,
    leadId: '',
    etapaDestino: null,
    leadNome: '',
    followupCount: 0,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  )

  const handleLeadUpdated = (updatedLead: Lead) => {
    setLeads((prev) => prev.map((l) => l.id === updatedLead.id ? { ...l, ...updatedLead } : l))
  }

  const activeLeads = leads.filter((l) => l.statusLead === 'ativo' || l.statusLead === 'geladeira' || l.statusLead === 'convertido' || l.statusLead === 'desqualificado')

  const getLeadsForEtapa = useCallback(
    (etapa: string) => activeLeads.filter((l) => l.etapa === etapa),
    [activeLeads]
  )

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const overId = event.over?.id as string
    if (overId && ETAPAS_LEAD.some((e) => e.id === overId)) {
      setOverColumnId(overId)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setActiveId(null)
    setOverColumnId(null)

    if (!over) return

    const leadId = active.id as string
    const lead = leads.find((l) => l.id === leadId)
    if (!lead) return

    // Determine target column
    let targetEtapa: string = over.id as string

    // If dropped on a card, use that card's column
    if (!ETAPAS_LEAD.some((e) => e.id === targetEtapa)) {
      const targetLead = leads.find((l) => l.id === targetEtapa)
      if (targetLead) targetEtapa = targetLead.etapa
    }

    if (targetEtapa === lead.etapa) return

    const etapasRequiringModal = ['chamar_depois', 'desqualificado', 'comprou', 'correios', 'voltou', 'geladeira']

    if (etapasRequiringModal.includes(targetEtapa)) {
      setMoveModal({
        isOpen: true,
        leadId,
        etapaDestino: targetEtapa as EtapaLead,
        leadNome: lead.nomeCliente,
        followupCount: lead._count?.followups || lead.followups?.length || 0,
      })
    } else {
      // Direct move
      moveLeadToEtapa(leadId, targetEtapa as EtapaLead)
    }
  }

  const moveLeadToEtapa = async (leadId: string, etapa: EtapaLead, extraData?: any) => {
    // extraData.etapa can override when 'comprou' is redirected to 'correios'
    const etapaFinal = ((extraData?.etapa as EtapaLead) || etapa)
    try {
      const res = await fetch(`/api/leads/${leadId}/etapa`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ etapa, ...extraData }),
      })

      if (res.ok) {
        setLeads((prev) =>
          prev.map((l) => {
            if (l.id === leadId) {
              return {
                ...l,
                etapa: etapaFinal,
                statusLead:
                  etapaFinal === 'comprou' ? 'convertido'
                  : etapaFinal === 'desqualificado' ? 'desqualificado'
                  : etapaFinal === 'geladeira' ? 'geladeira'
                  : etapaFinal === 'voltou' ? 'ativo'
                  : l.statusLead,
              }
            }
            return l
          })
        )
        onLeadMoved?.(leadId, etapaFinal)
      }
    } catch (error) {
      console.error('Erro ao mover lead:', error)
    }
  }

  const handleMoveConfirm = async (data: any) => {
    await moveLeadToEtapa(moveModal.leadId, moveModal.etapaDestino!, data)
    setMoveModal((prev) => ({ ...prev, isOpen: false }))
  }

  return (
    <>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <div className="flex gap-4 pb-4 kanban-scroll min-h-0">
          {ETAPAS_LEAD.map((etapa) => (
            <KanbanColumn
              key={etapa.id}
              id={etapa.id}
              title={etapa.label}
              leads={getLeadsForEtapa(etapa.id)}
              headerColor={etapa.headerColor}
              color={etapa.color}
              darkText={'darkText' in etapa ? (etapa as any).darkText : false}
              isOver={overColumnId === etapa.id}
              onLeadUpdated={handleLeadUpdated}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead && <LeadCard lead={activeLead} isDragging />}
        </DragOverlay>
      </DndContext>

      {moveModal.isOpen && moveModal.etapaDestino && (
        <MoveStageModal
          isOpen={moveModal.isOpen}
          onClose={() => setMoveModal((prev) => ({ ...prev, isOpen: false }))}
          onConfirm={handleMoveConfirm}
          etapaDestino={moveModal.etapaDestino}
          leadNome={moveModal.leadNome}
          followupCount={moveModal.followupCount}
        />
      )}
    </>
  )
}
