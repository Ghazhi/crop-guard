'use client'

import { useState } from 'react'
import { GitBranch, Plus, Pencil, Trash2, Check, X, Star } from 'lucide-react'
import { usePersistedState } from '@/lib/usePersistedState'
import {
  type WorkflowStageDef,
  DEFAULT_WORKFLOW_STAGES,
  DEFAULT_QUALIFYING_STAGE_ID,
  WORKFLOW_STAGES_KEY,
  WORKFLOW_QUALIFYING_STAGE_ID_KEY,
} from '../../_logics/workflowConfig'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { cn } from '@/lib/utils'

export function WorkflowStagesSection() {
  const [stages, setStages] = usePersistedState<WorkflowStageDef[]>(WORKFLOW_STAGES_KEY, DEFAULT_WORKFLOW_STAGES)
  const [qualifyingStageId, setQualifyingStageId] = usePersistedState<string>(WORKFLOW_QUALIFYING_STAGE_ID_KEY, DEFAULT_QUALIFYING_STAGE_ID)

  const [addingStage,      setAddingStage]      = useState(false)
  const [newStageName,     setNewStageName]     = useState('')
  const [editingStageId,   setEditingStageId]   = useState<string | null>(null)
  const [editingStageName, setEditingStageName] = useState('')

  const sortedStages = [...stages].sort((a, b) => a.stage - b.stage)
  const nextStageNumber = sortedStages.length > 0 ? sortedStages[sortedStages.length - 1].stage + 1 : 1

  function handleAddStage() {
    const name = newStageName.trim()
    if (!name) return
    const id = `wf-${Date.now()}`
    const def: WorkflowStageDef = { id, stage: nextStageNumber, name }
    setStages(prev => [...prev, def])
    setNewStageName('')
    setAddingStage(false)
  }

  function handleSaveStageName(stageId: string) {
    const name = editingStageName.trim()
    if (!name) return
    setStages(prev => prev.map(s => s.id === stageId ? { ...s, name } : s))
    setEditingStageId(null)
  }

  function handleDeleteStage(stageId: string) {
    setStages(prev => prev.filter(s => s.id !== stageId))
    if (qualifyingStageId === stageId) {
      const remaining = stages.filter(s => s.id !== stageId)
      setQualifyingStageId(remaining[0]?.id ?? '')
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitBranch className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
          <h2 className="text-base font-bold text-gray-900">Workflow Stages</h2>
        </div>
        <ButtonTemplate
          variant="primary" size="sm" label="Add Stage"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => { setAddingStage(true); setNewStageName('') }}
        />
      </div>

      <p className="text-xs text-gray-500">
        Rename the farmer enrollment workflow stages and choose which stage marks a farmer as a
        <span className="font-semibold" style={{ color: 'var(--brand-forest)' }}> Beneficiary</span> — farmers at that
        stage or later appear on the Programs &amp; Cohorts &gt; Beneficiary tab.
      </p>

      <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 overflow-hidden">
        {sortedStages.length === 0 && !addingStage && (
          <p className="text-sm text-gray-400 text-center py-8">No workflow stages yet. Click &quot;Add Stage&quot; to get started.</p>
        )}
        {sortedStages.map(s => {
          const isQualifying = qualifyingStageId === s.id
          return (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 group">
              <span className="w-7 h-7 shrink-0 rounded-full bg-gray-100 text-gray-500 text-xs font-bold flex items-center justify-center">
                {s.stage}
              </span>
              {editingStageId === s.id ? (
                <input
                  autoFocus
                  value={editingStageName}
                  onChange={e => setEditingStageName(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveStageName(s.id); if (e.key === 'Escape') setEditingStageId(null) }}
                  className="flex-1 h-8 px-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-(--brand-green)"
                />
              ) : (
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <p className="text-sm font-medium text-gray-800">{s.name}</p>
                  {isQualifying && (
                    <span className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none bg-emerald-100 text-emerald-700">
                      <Star className="w-2.5 h-2.5" /> Qualifying Stage
                    </span>
                  )}
                </div>
              )}
              <div className="flex items-center gap-1 shrink-0">
                {editingStageId === s.id ? (
                  <>
                    <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Save" leftIcon={<Check className="w-3.5 h-3.5" />} onClick={() => handleSaveStageName(s.id)} />
                    <ButtonTemplate variant="ghost" size="sm" isIcon tooltip="Cancel" leftIcon={<X className="w-3.5 h-3.5" />} onClick={() => setEditingStageId(null)} />
                  </>
                ) : (
                  <div className={cn('flex items-center gap-1', !isQualifying && 'opacity-0 group-hover:opacity-100')}>
                    {!isQualifying && (
                      <ButtonTemplate variant="outline" size="sm" label="Set as Qualifying" onClick={() => setQualifyingStageId(s.id)} />
                    )}
                    <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => { setEditingStageId(s.id); setEditingStageName(s.name) }} />
                    <ButtonTemplate variant="danger" size="sm" isIcon tooltip="Delete" leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => handleDeleteStage(s.id)} />
                  </div>
                )}
              </div>
            </div>
          )
        })}

        {addingStage && (
          <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <InputTemplate
              autoFocus
              placeholder="Stage name…"
              value={newStageName}
              onChange={e => setNewStageName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddStage(); if (e.key === 'Escape') setAddingStage(false) }}
              className="flex-1"
            />
            <ButtonTemplate variant="primary" size="sm" label="Save" leftIcon={<Check className="w-3.5 h-3.5" />} onClick={handleAddStage} />
            <ButtonTemplate variant="ghost" size="sm" label="Cancel" leftIcon={<X className="w-3.5 h-3.5" />} onClick={() => setAddingStage(false)} />
          </div>
        )}
      </div>
    </div>
  )
}
