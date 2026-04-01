'use client'

import { useState } from 'react'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { SCRIPT_ITEMS, OBJECOES } from '@/lib/constants'
import { cn } from '@/lib/utils'
import type { ScriptChecklistItem } from '@/types'

interface ChecklistSectionProps {
  leadId: string
  items: ScriptChecklistItem[]
  onUpdated: (item: ScriptChecklistItem) => void
}

export function ChecklistSection({ leadId, items, onUpdated }: ChecklistSectionProps) {
  const [loadingItem, setLoadingItem] = useState<number | null>(null)
  const [objecaoMap, setObjecaoMap] = useState<Record<number, string>>(() => {
    const map: Record<number, string> = {}
    items.forEach((i) => { if (i.objecao) map[i.item] = i.objecao })
    return map
  })
  const [objecaoOutroMap, setObjecaoOutroMap] = useState<Record<number, string>>({})

  const getItem = (itemNum: number) => items.find((i) => i.item === itemNum)

  const toggleItem = async (itemNum: number, currentConcluido: boolean) => {
    setLoadingItem(itemNum)
    try {
      const scriptItem = SCRIPT_ITEMS.find((s) => s.id === itemNum)
      const objecao = objecaoMap[itemNum] || null
      const objecaoOutro = objecaoOutroMap[itemNum] || null

      const res = await fetch(`/api/leads/${leadId}/checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item: itemNum,
          concluido: !currentConcluido,
          objecao: scriptItem?.hasObjecao ? objecao : null,
          objecaoOutro: scriptItem?.hasObjecao && objecao === 'outro' ? objecaoOutro : null,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        onUpdated(data.item)
      }
    } finally {
      setLoadingItem(null)
    }
  }

  const concluidos = items.filter((i) => i.concluido).length
  const total = 8
  const pct = Math.round((concluidos / total) * 100)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">Script de Atendimento</h3>
        <div className="flex items-center gap-2">
          <div className="h-1.5 w-24 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-yellow-500' : 'bg-red-500'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-sm font-medium text-gray-700">{concluidos}/{total}</span>
        </div>
      </div>

      <div className="space-y-2">
        {SCRIPT_ITEMS.map((scriptItem) => {
          const dbItem = getItem(scriptItem.id)
          const concluido = dbItem?.concluido || false
          const isLoading = loadingItem === scriptItem.id

          return (
            <div
              key={scriptItem.id}
              className={cn(
                'rounded-lg border p-3 transition-all',
                concluido ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
              )}
            >
              <div className="flex items-start gap-3">
                <button
                  onClick={() => toggleItem(scriptItem.id, concluido)}
                  disabled={isLoading}
                  className={cn(
                    'flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center mt-0.5 transition-all',
                    concluido
                      ? 'bg-green-500 border-green-500'
                      : 'border-gray-300 hover:border-green-400',
                    isLoading && 'opacity-50'
                  )}
                >
                  {concluido && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  {isLoading && (
                    <svg className="animate-spin w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 font-mono">{scriptItem.id}.</span>
                    <span className={cn('text-sm', concluido ? 'text-green-800 font-medium' : 'text-gray-700')}>
                      {scriptItem.label}
                    </span>
                  </div>

                  {scriptItem.hasObjecao && concluido && (
                    <div className="mt-2 space-y-2">
                      <Select
                        label="Objeção tratada"
                        value={objecaoMap[scriptItem.id] || dbItem?.objecao || ''}
                        onChange={(e) => {
                          setObjecaoMap((prev) => ({ ...prev, [scriptItem.id]: e.target.value }))
                        }}
                        options={OBJECOES.map((o) => ({ value: o.id, label: o.label }))}
                        placeholder="Selecione a objeção"
                      />
                      {(objecaoMap[scriptItem.id] === 'outro' || dbItem?.objecao === 'outro') && (
                        <Input
                          label="Especifique"
                          value={objecaoOutroMap[scriptItem.id] || dbItem?.objecaoOutro || ''}
                          onChange={(e) => {
                            setObjecaoOutroMap((prev) => ({ ...prev, [scriptItem.id]: e.target.value }))
                          }}
                          placeholder="Descreva a objeção"
                        />
                      )}
                    </div>
                  )}

                  {dbItem?.concluidoEm && (
                    <p className="text-xs text-gray-400 mt-1">
                      Concluído em {new Date(dbItem.concluidoEm).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
