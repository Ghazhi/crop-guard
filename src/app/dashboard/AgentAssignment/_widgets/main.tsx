'use client'

import { useState, useEffect, useMemo } from 'react'
import { Search, Users, AlertTriangle, UserCog, X, UserRoundPlus, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import { PersonAvatar } from '@/customComponents/PersonAvatar'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { ConfirmModal } from '@/customComponents/ConfirmModal'

import { getAgents, getCohorts, getPrograms, getFarmersByCohort, getFarmersByAgent } from '../_logics/functions'
import type { AgentSummary, CohortRow, ProgramOption, FarmerPreview } from '../_logics/interface'

// ── Helpers ───────────────────────────────────────────────────────────────────

function loadPct(current: number, capacity: number) {
  return capacity > 0 ? Math.min(1, current / capacity) : 0
}
function loadColor(pct: number) {
  if (pct >= 0.9) return 'bg-red-500'
  if (pct >= 0.7) return 'bg-amber-400'
  return 'bg-emerald-500'
}

const SELECT_STYLE = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E")`,
  backgroundRepeat: 'no-repeat' as const,
  backgroundPosition: 'right 8px center',
}

const SELECT_CLS = 'h-9 text-sm rounded-lg border border-gray-200 bg-white px-3 pr-8 appearance-none focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 cursor-pointer'

// ── Add Agent to Cohort sheet ─────────────────────────────────────────────────

function AddAgentSheet({ open, onClose, cohort, agents, onSave }: {
  open: boolean; onClose: () => void
  cohort: CohortRow | null; agents: AgentSummary[]
  onSave: (cohortId: string, agentId: string) => void
}) {
  const [agentId, setAgentId] = useState('')
  const [saving,  setSaving]  = useState(false)

  useEffect(() => { if (open) setAgentId('') }, [open])

  const available = agents.filter(a => !cohort?.agents.some(ca => ca.agentId === a.id))

  async function handleSave() {
    if (!agentId) { toast.error('Select an agent'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    setSaving(false)
    onSave(cohort!.cohortId, agentId)
    onClose()
  }

  return (
    <SheetTemplate open={open} onClose={onClose} title="Add Agent to Cohort"
      bodyClassName="px-6 py-5 space-y-4"
      footer={
        <>
          <ButtonTemplate variant="outline" label="Cancel" fullWidth onClick={onClose} />
          <ButtonTemplate label={saving ? 'Saving…' : 'Add to Cohort'} fullWidth
            isDisabled={saving || !agentId || available.length === 0} onClick={handleSave} />
        </>
      }
    >
      {cohort && (
        <div className="rounded-xl px-4 py-3 space-y-1" style={{ background: 'var(--brand-gray)', border: '1px solid var(--brand-pale)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--brand-forest)' }}>{cohort.cohortName}</p>
          <p className="text-[11px] text-gray-400">{cohort.programName} · {cohort.region} · {cohort.district}</p>
          <p className="text-[11px] text-gray-400">{cohort.farmerCount} enrolled farmers</p>
          {cohort.agents.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-0.5">
              {cohort.agents.map(a => (
                <span key={a.agentId} className="text-[11px] font-medium" style={{ color: 'var(--brand-dark)' }}>
                  {a.agentName}{a.isPrimary ? ' (primary)' : ''}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Add Agent</p>
        <select value={agentId} onChange={e => setAgentId(e.target.value)}
          className="w-full h-10 text-sm rounded-lg border border-gray-200 bg-white px-3 pr-9 appearance-none focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 cursor-pointer"
          style={SELECT_STYLE}>
          <option value="">Select agent…</option>
          {available.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        {available.length === 0 && (
          <p className="text-xs text-amber-600">All agents are already assigned to this cohort.</p>
        )}
      </div>
    </SheetTemplate>
  )
}

// ── Assign Farmers sheet ──────────────────────────────────────────────────────

function AssignFarmersSheet({ open, onClose, cohort, agents }: {
  open: boolean; onClose: () => void
  cohort: CohortRow | null; agents: AgentSummary[]
}) {
  const [farmers,    setFarmers]    = useState<FarmerPreview[]>([])
  const [selected,   setSelected]   = useState<Set<string>>(new Set())
  const [targetAgent,setTargetAgent] = useState('')
  const [saving,     setSaving]     = useState(false)

  useEffect(() => {
    if (!open || !cohort) return
    setSelected(new Set()); setTargetAgent('')
    getFarmersByCohort(cohort.cohortId).then(setFarmers)
  }, [open, cohort])

  function toggle(id: string) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleAssign() {
    if (!targetAgent) { toast.error('Select an agent'); return }
    if (!selected.size) { toast.error('Select at least one farmer'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 400))
    setSaving(false)
    toast.success(`${selected.size} farmer${selected.size !== 1 ? 's' : ''} assigned to ${agents.find(a => a.id === targetAgent)?.name}`)
    onClose()
  }

  return (
    <SheetTemplate open={open} onClose={onClose}
      title={`Assign Farmers — ${cohort?.cohortName ?? ''}`}
      bodyClassName="px-6 py-5 space-y-4"
      footer={
        <>
          <ButtonTemplate variant="outline" label="Close" fullWidth onClick={onClose} />
          <ButtonTemplate label={saving ? 'Assigning…' : 'Assign Farmers'} fullWidth
            leftIcon={<Users className="w-3.5 h-3.5" />}
            isDisabled={saving || !selected.size || !targetAgent} onClick={handleAssign} />
        </>
      }
    >
      {cohort && (
        <div className="rounded-xl px-4 py-3" style={{ background: 'var(--brand-gray)', border: '1px solid var(--brand-pale)' }}>
          <div className="flex items-start justify-between gap-2">
            <div className="space-y-0.5">
              <p className="text-[11px] text-gray-400">
                {cohort.programName} · <span className="font-medium" style={{ color: 'var(--brand-dark)' }}>{cohort.cohortName}</span>
              </p>
              <p className="text-[11px] text-gray-400">{cohort.farmerCount} enrolled farmers</p>
            </div>
            <div className="flex items-center gap-1.5 flex-wrap justify-end">
              {cohort.agents.map(a => (
                <span key={a.agentId} className={cn(
                  'text-[11px] font-medium px-2 py-0.5 rounded-full leading-none whitespace-nowrap',
                  a.isPrimary ? 'text-white' : 'bg-emerald-50 text-emerald-700'
                )} style={a.isPrimary ? { backgroundColor: 'var(--brand-dark)' } : {}}>
                  {a.agentName}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Assign selected farmers to</p>
        <select value={targetAgent} onChange={e => setTargetAgent(e.target.value)}
          className="w-full h-10 text-sm rounded-lg border border-gray-200 bg-white px-3 pr-9 appearance-none focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 cursor-pointer"
          style={SELECT_STYLE}>
          <option value="">Select agent…</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
            Farmers ({selected.size} selected)
          </p>
          <div className="flex items-center gap-2">
            <button className="text-xs font-medium hover:underline" style={{ color: 'var(--brand-dark)' }}
              onClick={() => setSelected(new Set(farmers.map(f => f.id)))}>All</button>
            <span className="text-gray-300 text-xs">|</span>
            <button className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
              onClick={() => setSelected(new Set())}>None</button>
          </div>
        </div>
        <div className="space-y-1">
          {farmers.map(f => (
            <div key={f.id}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
              onClick={() => toggle(f.id)}
            >
              <div className={cn(
                'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors',
                selected.has(f.id) ? 'border-(--brand-dark) bg-(--brand-dark)' : 'border-gray-300'
              )}>
                {selected.has(f.id) && (
                  <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>
              <PersonAvatar name={f.fullName} size={28} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium leading-tight" style={{ color: 'var(--brand-forest)' }}>{f.fullName}</p>
                <p className="text-[11px] text-gray-400">{f.phone}</p>
              </div>
              <div className="text-right shrink-0">
                {f.agentName && <p className="text-[11px] font-medium" style={{ color: 'var(--brand-dark)' }}>{f.agentName}</p>}
                {f.currentFri !== null && <p className="text-[11px] text-gray-400">FRI {f.currentFri}</p>}
              </div>
            </div>
          ))}
          {farmers.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">No farmers enrolled in this cohort</p>
          )}
        </div>
      </div>
    </SheetTemplate>
  )
}

// ── Agent Farmers sheet ───────────────────────────────────────────────────────

function AgentFarmersSheet({ open, onClose, agent, programs }: {
  open: boolean; onClose: () => void
  agent: AgentSummary | null; programs: ProgramOption[]
}) {
  const [farmers,       setFarmers]       = useState<FarmerPreview[]>([])
  const [filterProgram, setFilterProgram] = useState('')
  const [filterCohort,  setFilterCohort]  = useState('')

  useEffect(() => {
    if (!open || !agent) return
    setFilterProgram(''); setFilterCohort('')
    getFarmersByAgent(agent.id).then(setFarmers)
  }, [open, agent])

  const cohortOptions = useMemo(() => {
    const seen = new Map<string, string>()
    farmers.filter(f => !filterProgram || f.programId === filterProgram)
      .forEach(f => seen.set(f.cohortId, f.cohortName))
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }))
  }, [farmers, filterProgram])

  const displayed = farmers.filter(f => {
    if (filterProgram && f.programId !== filterProgram) return false
    if (filterCohort  && f.cohortId  !== filterCohort)  return false
    return true
  })

  return (
    <SheetTemplate open={open} onClose={onClose}
      title={`${agent?.name ?? ''} — Assigned Farmers`}
      bodyClassName="px-6 py-5 space-y-4"
    >
      {agent && (
        <div className="grid grid-cols-3 gap-3">
          {([
            [agent.cohortCount,  'Cohorts'  ],
            [agent.farmerCount,  'Farmers'  ],
            [agent.checkinCount, 'Check-ins'],
          ] as [number, string][]).map(([val, label]) => (
            <div key={label} className="rounded-xl py-3 px-2 flex flex-col items-center" style={{ background: 'var(--brand-gray)', border: '1px solid var(--brand-pale)' }}>
              <span className="text-2xl font-bold leading-none" style={{ color: 'var(--brand-forest)' }}>{val}</span>
              <span className="text-[10px] text-gray-400 mt-1">{label}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <select value={filterProgram} onChange={e => { setFilterProgram(e.target.value); setFilterCohort('') }}
          className={SELECT_CLS} style={SELECT_STYLE}>
          <option value="">All programs</option>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterCohort} onChange={e => setFilterCohort(e.target.value)}
          className={SELECT_CLS} style={SELECT_STYLE}>
          <option value="">All cohorts</option>
          {cohortOptions.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>
      <div className="space-y-1">
        {displayed.map(f => (
          <div key={f.id} className="flex items-center gap-3 py-3 px-3 rounded-xl hover:bg-gray-50 transition-colors">
            <PersonAvatar name={f.fullName} size={32} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--brand-forest)' }}>{f.fullName}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{f.phone} · {f.region}</p>
              <p className="text-[11px] font-medium mt-0.5" style={{ color: 'var(--brand-dark)' }}>
                {f.programName} · {f.cohortName}
              </p>
            </div>
            {f.currentFri !== null && (
              <span className="text-sm font-bold tabular-nums shrink-0" style={{ color: 'var(--brand-forest)' }}>
                FRI {f.currentFri}
              </span>
            )}
          </div>
        ))}
        {displayed.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">No farmers assigned</p>
        )}
      </div>
    </SheetTemplate>
  )
}

// ── Bulk Assign sheet ─────────────────────────────────────────────────────────

function BulkAssignSheet({ open, onClose, agents, cohorts }: {
  open: boolean; onClose: () => void
  agents: AgentSummary[]; cohorts: CohortRow[]
}) {
  const [agentId,   setAgentId]   = useState('')
  const [cohortIds, setCohortIds] = useState<Set<string>>(new Set())
  const [saving,    setSaving]    = useState(false)

  useEffect(() => { if (open) { setAgentId(''); setCohortIds(new Set()) } }, [open])

  function toggleCohort(id: string) {
    setCohortIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  async function handleSave() {
    if (!agentId)        { toast.error('Select an agent'); return }
    if (!cohortIds.size) { toast.error('Select at least one cohort'); return }
    setSaving(true)
    await new Promise(r => setTimeout(r, 500))
    setSaving(false)
    toast.success(`${agents.find(a => a.id === agentId)?.name} assigned to ${cohortIds.size} cohort${cohortIds.size !== 1 ? 's' : ''}`)
    onClose()
  }

  return (
    <SheetTemplate open={open} onClose={onClose} title="Bulk Assign Agent"
      bodyClassName="px-6 py-5 space-y-4"
      footer={
        <>
          <ButtonTemplate variant="outline" label="Cancel" fullWidth onClick={onClose} />
          <ButtonTemplate fullWidth
            label={saving ? 'Assigning…' : `Assign to ${cohortIds.size || 0} Cohort${cohortIds.size !== 1 ? 's' : ''}`}
            isDisabled={saving} onClick={handleSave} />
        </>
      }
    >
      <div className="space-y-1.5">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Agent</p>
        <select value={agentId} onChange={e => setAgentId(e.target.value)}
          className="w-full h-10 text-sm rounded-lg border border-gray-200 bg-white px-3 pr-9 appearance-none focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 cursor-pointer"
          style={SELECT_STYLE}>
          <option value="">Select agent…</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Cohorts</p>
        {cohorts.map(c => (
          <div key={c.cohortId}
            className="flex items-start gap-3 py-2.5 px-3 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors"
            onClick={() => toggleCohort(c.cohortId)}
          >
            <div className={cn(
              'w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors',
              cohortIds.has(c.cohortId) ? 'border-(--brand-dark) bg-(--brand-dark)' : 'border-gray-300 bg-white'
            )}>
              {cohortIds.has(c.cohortId) && (
                <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 10 10" fill="none">
                  <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium leading-tight" style={{ color: 'var(--brand-forest)' }}>{c.cohortName}</p>
              <p className="text-[11px] text-gray-400 mt-0.5">{c.programName} · {c.district}</p>
            </div>
          </div>
        ))}
      </div>
    </SheetTemplate>
  )
}

// ── Agent Card ────────────────────────────────────────────────────────────────

function AgentCard({ agent, isActive, onFilter, onViewFarmers }: {
  agent: AgentSummary; isActive: boolean
  onFilter: () => void; onViewFarmers: () => void
}) {
  const pct   = loadPct(agent.farmerCount, agent.capacity)
  const color = loadColor(pct)

  return (
    <div
      className={cn(
        'bg-white rounded-2xl border shadow-sm p-5 flex flex-col gap-4 cursor-pointer transition-colors',
        isActive ? 'border-(--brand-dark) ring-2 ring-(--brand-dark)/10' : 'border-gray-100 hover:border-gray-200'
      )}
      onClick={onFilter}
    >
      <div className="flex items-start gap-3">
        <PersonAvatar name={agent.name} size={40} />
        <div className="min-w-0">
          <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--brand-forest)' }}>{agent.name}</p>
          <p className="text-xs text-gray-400 mt-0.5">{agent.regions.join(', ')}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 divide-x divide-gray-100">
        {([
          [agent.cohortCount,  'Cohorts'   ],
          [agent.farmerCount,  'Farmers'   ],
          [agent.checkinCount, 'Check-ins' ],
        ] as [number, string][]).map(([val, label]) => (
          <div key={label} className="flex flex-col items-center py-1 px-2">
            <span className="text-xl font-bold leading-none" style={{ color: 'var(--brand-forest)' }}>{val}</span>
            <span className="text-[10px] text-gray-400 mt-1">{label}</span>
          </div>
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 rounded-full bg-gray-100 overflow-hidden">
            <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${Math.round(pct * 100)}%` }} />
          </div>
          <span className="text-[10px] text-gray-400 shrink-0 tabular-nums">{agent.farmerCount} farmers</span>
        </div>
        <button className="text-[11px] font-medium hover:underline" style={{ color: 'var(--brand-dark)' }}
          onClick={e => { e.stopPropagation(); onViewFarmers() }}>
          View farmers
        </button>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function Main() {
  const [agents,   setAgents]   = useState<AgentSummary[]>([])
  const [cohorts,  setCohorts]  = useState<CohortRow[]>([])
  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [loading,  setLoading]  = useState(true)

  const [filterAgent,   setFilterAgent]   = useState('')
  const [filterProgram, setFilterProgram] = useState('')
  const [filterCohort,  setFilterCohort]  = useState('')
  const [search,        setSearch]        = useState('')


  const [removeAgentTarget, setRemoveAgentTarget] = useState<{ cohortId: string; agentId: string; agentName: string } | null>(null)

  const [addAgentOpen,    setAddAgentOpen]    = useState(false)
  const [assignFarmOpen,  setAssignFarmOpen]  = useState(false)
  const [agentFarmOpen,   setAgentFarmOpen]   = useState(false)
  const [bulkOpen,        setBulkOpen]        = useState(false)
  const [focusCohort,     setFocusCohort]     = useState<CohortRow | null>(null)
  const [focusAgent,      setFocusAgent]      = useState<AgentSummary | null>(null)

  useEffect(() => {
    Promise.all([getAgents(), getCohorts(), getPrograms()]).then(([a, c, p]) => {
      setAgents(a); setCohorts(c); setPrograms(p); setLoading(false)
    })
  }, [])


  const unassignedCount = cohorts.filter(c => c.agents.length === 0).length
  const cohortOptions   = useMemo(
    () => cohorts.filter(c => !filterProgram || c.programId === filterProgram),
    [cohorts, filterProgram]
  )
  const activeAgentName = filterAgent ? agents.find(a => a.id === filterAgent)?.name : ''

  const displayed = useMemo(() => cohorts.filter(c => {
    if (filterAgent  && !c.agents.some(a => a.agentId === filterAgent)) return false
    if (filterProgram && c.programId !== filterProgram) return false
    if (filterCohort  && c.cohortId  !== filterCohort)  return false
    if (search.trim()) {
      const q = search.toLowerCase()
      if (!c.cohortName.toLowerCase().includes(q) && !c.district.toLowerCase().includes(q)) return false
    }
    return true
  }), [cohorts, filterAgent, filterProgram, filterCohort, search])

  function handleAddAgentSave(cohortId: string, agentId: string) {
    const agent = agents.find(a => a.id === agentId)!
    const isFirst = cohorts.find(c => c.cohortId === cohortId)?.agents.length === 0
    setCohorts(prev => prev.map(c => c.cohortId !== cohortId ? c : {
      ...c,
      agents: isFirst
        ? [{ agentId, agentName: agent.name, isPrimary: true }]
        : [...c.agents, { agentId, agentName: agent.name, isPrimary: false }],
    }))
    setAgents(prev => prev.map(a => a.id !== agentId ? a : { ...a, cohortCount: a.cohortCount + 1 }))
    toast.success(`${agent.name} added to cohort`)
  }

  function handleRemoveAgent(cohortId: string, agentId: string) {
    const agent = agents.find(a => a.id === agentId)
    setCohorts(prev => prev.map(c => {
      if (c.cohortId !== cohortId) return c
      const remaining = c.agents.filter(a => a.agentId !== agentId)
      if (remaining.length > 0 && !remaining[0].isPrimary) {
        remaining[0] = { ...remaining[0], isPrimary: true }
      }
      return { ...c, agents: remaining }
    }))
    setAgents(prev => prev.map(a => a.id !== agentId ? a : { ...a, cohortCount: Math.max(0, a.cohortCount - 1) }))
    toast.success(`${agent?.name ?? 'Agent'} unassigned`)
  }

  return (
    <div className="p-6 space-y-6" style={{ background: 'var(--brand-gray)', minHeight: '100vh' }}>

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-forest)' }}>Agent Assignments</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--brand-slate)' }}>
            {loading ? '…' : (
              <>
                {agents.length} agent{agents.length !== 1 ? 's' : ''} · {cohorts.length} cohort{cohorts.length !== 1 ? 's' : ''}
                {unassignedCount > 0 && <span className="ml-1.5 font-semibold text-amber-600">· {unassignedCount} unassigned</span>}
              </>
            )}
          </p>
        </div>
        <ButtonTemplate label="Bulk Assign" leftIcon={<UserCog className="w-3.5 h-3.5" />}
          variant="outline" onClick={() => setBulkOpen(true)} />
      </div>

      {/* Agent cards */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-1">
          {[0, 1, 2, 3].map(i => <div key={i} className="h-44 w-64 shrink-0 rounded-2xl bg-gray-200 animate-pulse" />)}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-1">
          {agents
            .filter(a => !filterAgent || filterAgent === a.id)
            .map(a => (
              <div key={a.id} className="w-64 shrink-0">
                <AgentCard agent={a}
                  isActive={filterAgent === a.id}
                  onFilter={() => setFilterAgent(prev => prev === a.id ? '' : a.id)}
                  onViewFarmers={() => { setFocusAgent(a); setAgentFarmOpen(true) }} />
              </div>
            ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <select value={filterAgent} onChange={e => setFilterAgent(e.target.value)}
          className={SELECT_CLS} style={SELECT_STYLE}>
          <option value="">All agents</option>
          {agents.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <select value={filterProgram} onChange={e => { setFilterProgram(e.target.value); setFilterCohort('') }}
          className={SELECT_CLS} style={SELECT_STYLE}>
          <option value="">All programs</option>
          {programs.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select value={filterCohort} onChange={e => setFilterCohort(e.target.value)}
          className={SELECT_CLS} style={SELECT_STYLE}>
          <option value="">All cohorts</option>
          {cohortOptions.map(c => <option key={c.cohortId} value={c.cohortId}>{c.cohortName}</option>)}
        </select>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input className="h-9 pl-8 pr-3 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 w-48"
            placeholder="Search cohort / district…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        {(filterAgent || filterProgram || filterCohort || search) && (
          <button onClick={() => { setFilterAgent(''); setFilterProgram(''); setFilterCohort(''); setSearch('') }}
            className="flex items-center gap-1 h-9 px-3 rounded-lg text-sm text-gray-500 border border-gray-200 hover:border-gray-300 transition-colors">
            <X className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      {/* Cohort list */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
          <p className="text-sm font-semibold" style={{ color: 'var(--brand-forest)' }}>
            {activeAgentName ? `${activeAgentName}'s Cohorts` : 'All Cohorts'}{' '}
            <span className="font-normal text-gray-400">({displayed.length})</span>
          </p>
          {unassignedCount > 0 && (
            <div className="flex items-center gap-1.5 text-amber-600 text-xs font-semibold">
              <AlertTriangle className="w-3.5 h-3.5" /> {unassignedCount} unassigned
            </div>
          )}
        </div>

        {loading ? (
          <div className="p-4 space-y-3">
            {[0,1,2,3].map(i => <div key={i} className="h-14 rounded-lg bg-gray-100 animate-pulse" />)}
          </div>
        ) : displayed.length === 0 ? (
          <div className="text-center py-14">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-20" style={{ color: 'var(--brand-slate)' }} />
            <p className="text-sm font-medium text-gray-400">No cohorts match your filters</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {displayed.map(c => {
              const pct          = loadPct(c.farmerCount, c.capacity)
              const isUnassigned = c.agents.length === 0

              return (
                <div key={c.cohortId}>
                  {/* Cohort row */}
                  <div className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50/60 transition-colors">
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--brand-forest)' }}>
                          {c.cohortName}
                        </p>
                        {isUnassigned && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 leading-none">
                            Unassigned
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400">{c.programName} · {c.region} · {c.district}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="w-24 h-1 rounded-full bg-gray-100 overflow-hidden shrink-0">
                          <div className={cn('h-full rounded-full', loadColor(pct))}
                            style={{ width: `${Math.round(pct * 100)}%` }} />
                        </div>
                        <span className="text-[11px] text-gray-400 tabular-nums shrink-0">{c.farmerCount}/{c.capacity}</span>
                        {c.agents.map(a => (
                          <span key={a.agentId} className={cn(
                            'group/chip flex items-center gap-1 text-[11px] font-medium pl-2.5 pr-1 py-1 rounded-full leading-none whitespace-nowrap',
                            a.isPrimary ? 'text-white' : 'bg-emerald-50 text-emerald-700'
                          )} style={a.isPrimary ? { backgroundColor: 'var(--brand-dark)' } : {}}>
                            {a.agentName}
                            {a.isPrimary && <span className="text-[9px] opacity-70 font-normal">primary</span>}
                            <button
                              onClick={() => setRemoveAgentTarget({ cohortId: c.cohortId, agentId: a.agentId, agentName: a.agentName })}
                              className={cn(
                                'w-3.5 h-3.5 rounded-full flex items-center justify-center opacity-0 group-hover/chip:opacity-100 transition-opacity',
                                a.isPrimary ? 'hover:bg-white/20' : 'hover:bg-emerald-100'
                              )}
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <ButtonTemplate variant="outline" size="sm" label="Farmers"
                        leftIcon={<Users className="w-3 h-3" />}
                        onClick={() => { setFocusCohort(c); setAssignFarmOpen(true) }} />
                      {isUnassigned ? (
                        <ButtonTemplate variant="outline" size="sm"
                          label="Assign Agent"
                          leftIcon={<UserRoundPlus className="w-3.5 h-3.5" />}
                          onClick={() => { setFocusCohort(c); setAddAgentOpen(true) }} />
                      ) : (
                        <ButtonTemplate variant="outline" size="sm"
                          label="Add Agent"
                          leftIcon={<UserPlus className="w-3.5 h-3.5" />}
                          onClick={() => { setFocusCohort(c); setAddAgentOpen(true) }} />
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Sheets */}
      <AddAgentSheet
        open={addAgentOpen} onClose={() => { setAddAgentOpen(false); setFocusCohort(null) }}
        cohort={focusCohort} agents={agents} onSave={handleAddAgentSave}
      />
      <AssignFarmersSheet
        open={assignFarmOpen} onClose={() => { setAssignFarmOpen(false); setFocusCohort(null) }}
        cohort={focusCohort} agents={agents}
      />
      <AgentFarmersSheet
        open={agentFarmOpen} onClose={() => { setAgentFarmOpen(false); setFocusAgent(null) }}
        agent={focusAgent} programs={programs}
      />
      <BulkAssignSheet
        open={bulkOpen} onClose={() => setBulkOpen(false)}
        agents={agents} cohorts={cohorts}
      />
      <ConfirmModal
        open={!!removeAgentTarget}
        title="Remove agent?"
        message={`Remove ${removeAgentTarget?.agentName ?? 'this agent'} from this cohort?`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => { if (removeAgentTarget) handleRemoveAgent(removeAgentTarget.cohortId, removeAgentTarget.agentId); setRemoveAgentTarget(null) }}
        onCancel={() => setRemoveAgentTarget(null)}
      />
    </div>
  )
}
