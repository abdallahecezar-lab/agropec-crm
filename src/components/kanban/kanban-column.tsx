'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { LeadCard } from './lead-card'
import { cn } from '@/lib/utils'
import type { Lead } from '@/types'

interface KanbanColumnProps {
  id: string
  title: string
  leads: Lead[]
  headerColor: string
  color: string
  darkText?: boolean
  isOver?: boolean
  onLeadUpdated?: (lead: Lead) => void
}

export function KanbanColumn({ id, title, leads, headerColor, color, darkText = false, isOver, onLeadUpdated }: KanbanColumnProps) {
  const { setNodeRef } = useDroppable({ id })

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border-2 min-w-[280px] max-w-[280px] transition-colors',
        color,
        isOver && 'border-green-400 shadow-lg'
      )}
    >
      {/* Column header */}
      <div className={cn('px-4 py-3 rounded-t-xl', headerColor)}>
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm text-gray-900">{title}</h3>
          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/20 text-gray-900">
            {leads.length}
          </span>
        </div>
      </div>

      {/* Cards area */}
      <div
        ref={setNodeRef}
        className="flex-1 p-3 space-y-2 min-h-[200px] overflow-y-auto max-h-[calc(100vh-220px)] scrollbar-thin"
      >
        <SortableContext items={leads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
          {leads.map((lead) => (
            <LeadCard key={lead.id} lead={lead} onUpdated={onLeadUpdated} />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="flex flex-col items-center justify-center h-24 text-gray-400 text-sm">
            <svg className="w-6 h-6 mb-1 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Vazio
          </div>
        )}
      </div>
    </div>
  )
}
