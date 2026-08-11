'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  ChevronRight, Check, X, Clock, PackageCheck, Truck, CreditCard,
  UserCheck, FileText, Users, ArrowRight,
} from 'lucide-react'
import { PersonAvatar } from '@/customComponents/PersonAvatar'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { usePersistedState } from '@/lib/usePersistedState'
import { cn } from '@/lib/utils'
import { getFarmers, getProgramOptions } from '../../FarmersRegistry/_logics/functions'
import type { Farmer, ProgramOption } from '../../FarmersRegistry/_logics/interface'
import { DEFAULT_WORKFLOW_STAGES, WORKFLOW_STAGES_KEY } from '../../Configuration/_logics/workflowConfig'

// ─── Constants ──────────────────────────────────────────────────────────────

// icons aren't part of the admin-editable config — keep this hardcoded map by stage number
const WORKFLOW_STAGE_ICONS: Record<number, React.ElementType> = {
  1: FileText, 2: UserCheck, 3: Clock, 4: CreditCard, 5: Check, 6: Check, 7: Truck, 8: PackageCheck,
}

function useWorkflowStages() {
  const [stages] = usePersistedState(WORKFLOW_STAGES_KEY, DEFAULT_WORKFLOW_STAGES)
  return useMemo(
    () => [...stages]
      .sort((a, b) => a.stage - b.stage)
      .map(s => ({ stage: s.stage, name: s.name, icon: WORKFLOW_STAGE_ICONS[s.stage] ?? Clock })),
    [stages],
  )
}

const STATUS_VARIANT: Record<string, 'success' | 'info' | 'neutral'> = {
  active:    'success',
  graduated: 'info',
  withdrawn: 'neutral',
}

/** Deterministic fallback enrolment date for farmers whose enrollment record doesn't carry a real one yet. */
function enrolledDate(farmerId: string, registeredAt?: string) {
  if (registeredAt) return registeredAt
  const h = farmerId.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0)
  return new Date(2026, h % 8, 1 + (h % 27)).toISOString().slice(0, 10)
}

// ─── Stage tracker ────────────────────────────────────────────────────────────

function StageTracker({ current }: { current: number }) {
  const WORKFLOW_STAGES = useWorkflowStages()
  return (
    <div className="flex items-start gap-0 overflow-x-auto pb-2">
      {WORKFLOW_STAGES.map((s, idx) => {
        const status = s.stage < current ? 'completed' : s.stage === current ? 'active' : 'pending'
        const Icon = s.icon
        return (
          <div key={s.stage} className="flex items-start min-w-0">
            <div className="flex flex-col items-center min-w-18">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all',
                status === 'completed' && 'bg-emerald-500',
                status === 'pending'   && 'bg-gray-200',
              )}
                style={status === 'active' ? { backgroundColor: 'var(--brand-dark)', boxShadow: '0 0 0 4px var(--brand-mint)' } : undefined}
              >
                {status === 'completed' ? (
                  <Check className="w-4 h-4 text-white" />
                ) : (
                  <Icon className={cn('w-3.5 h-3.5', status === 'active' ? 'text-white' : 'text-gray-400')} />
                )}
              </div>
              <p className={cn('text-[9px] text-center mt-1 leading-tight max-w-15', status === 'active' ? 'font-semibold' : 'text-gray-400')}
                style={status === 'active' ? { color: 'var(--brand-dark)' } : undefined}>
                {s.name}
              </p>
            </div>
            {idx < WORKFLOW_STAGES.length - 1 && (
              <div className={cn('w-6 h-0.5 mt-4 shrink-0', status === 'completed' ? 'bg-emerald-400' : 'bg-gray-200')} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Detail sheet ─────────────────────────────────────────────────────────────

function EnrollmentDetailSheet({
  farmer, onClose, onAdvance, onDecline,
}: {
  farmer: Farmer | null
  onClose: () => void
  onAdvance: (farmer: Farmer) => void
  onDecline: (farmer: Farmer) => void
}) {
  const WORKFLOW_STAGES = useWorkflowStages()
  const enr = farmer?.enrollment ?? null
  const canAct = !!enr && enr.status === 'active' && enr.currentStage < WORKFLOW_STAGES.length

  return (
    <SheetTemplate
      open={!!farmer}
      onClose={onClose}
      title={farmer?.fullName ?? ''}
      subtitle={farmer?.nationalId}
      footer={farmer && enr && canAct ? (
        <>
          <ButtonTemplate variant="outline" size="sm" fullWidth
            leftIcon={<X className="w-3.5 h-3.5" />}
            label="Decline"
            className="text-red-600! border-red-200 hover:bg-red-50"
            onClick={() => onDecline(farmer)} />
          <ButtonTemplate variant="primary" size="sm" fullWidth
            leftIcon={<ArrowRight className="w-3.5 h-3.5" />}
            label={`Advance to Stage ${enr.currentStage + 1}`}
            onClick={() => onAdvance(farmer)} />
        </>
      ) : undefined}
    >
      {farmer && enr && (
        <div className="px-6 py-5 flex flex-col gap-5">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Current Enrollment</p>
            <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-4 text-xs">
              <div>
                <span className="text-gray-400">Program</span>
                <p className="font-medium mt-0.5" style={{ color: 'var(--brand-forest)' }}>{enr.programName}</p>
              </div>
              <div>
                <span className="text-gray-400">Cohort</span>
                <p className="font-medium mt-0.5" style={{ color: 'var(--brand-forest)' }}>{enr.cohortName ?? '—'}</p>
              </div>
              <div>
                <span className="text-gray-400">Status</span>
                <p className="mt-0.5"><BadgeTemplate label={enr.status} variant={STATUS_VARIANT[enr.status] ?? 'neutral'} size="sm" /></p>
              </div>
              <div>
                <span className="text-gray-400">Enrolled</span>
                <p className="font-medium mt-0.5" style={{ color: 'var(--brand-forest)' }}>
                  {new Date(enrolledDate(farmer.id, enr.registeredAt)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Workflow Progress</p>
            <StageTracker current={enr.currentStage} />
          </div>
        </div>
      )}
      {farmer && !enr && (
        <div className="px-6 py-10 text-center text-gray-400 text-sm">This farmer has no active enrollment.</div>
      )}
    </SheetTemplate>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function Main() {
  const WORKFLOW_STAGES = useWorkflowStages()
  const [farmers, setFarmers] = usePersistedState<Farmer[]>('ew-farmers', [])
  const [programs, setPrograms] = useState<ProgramOption[]>([])
  const [loading, setLoading] = useState(true)

  const [statsOpen, setStatsOpen] = usePersistedState('ew-stats', false)
  const [filterProgram, setFilterProgram] = usePersistedState('ew-program', '')
  const [filterStage, setFilterStage] = usePersistedState('ew-stage', '')
  const [filterStatus, setFilterStatus] = usePersistedState('ew-status', '')
  const [focusFarmerId, setFocusFarmerId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getFarmers(), getProgramOptions()]).then(([f, p]) => {
      // don't clobber farmers already restored from sessionStorage (stage/status changes from this session)
      setFarmers(prev => prev.length > 0 ? prev : f)
      setPrograms(p); setLoading(false)
    })
  }, [])

  const focusFarmer = farmers.find(f => f.id === focusFarmerId) ?? null

  function advanceStage(farmer: Farmer) {
    setFarmers(prev => prev.map(f => f.id === farmer.id && f.enrollment
      ? { ...f, enrollment: { ...f.enrollment, currentStage: f.enrollment.currentStage + 1 } }
      : f))
  }

  function declineEnrollment(farmer: Farmer) {
    setFarmers(prev => prev.map(f => f.id === farmer.id && f.enrollment
      ? { ...f, enrollment: { ...f.enrollment, status: 'withdrawn' } }
      : f))
    setFocusFarmerId(null)
  }

  const enrolled = useMemo(() => farmers.filter(f => f.enrollment), [farmers])

  const stageStats = useMemo(() => WORKFLOW_STAGES.map(s => ({
    ...s,
    count: enrolled.filter(f => (f.enrollment?.currentStage ?? 0) === s.stage).length,
  })), [enrolled, WORKFLOW_STAGES])

  const visible = useMemo(() => enrolled.filter(f => {
    const enr = f.enrollment!
    if (filterProgram && enr.programId !== filterProgram) return false
    if (filterStage && String(enr.currentStage) !== filterStage) return false
    if (filterStatus && enr.status !== filterStatus) return false
    return true
  }), [enrolled, filterProgram, filterStage, filterStatus])

  const hasActiveFilter = !!filterProgram || !!filterStage || !!filterStatus

  function clearFilters() {
    setFilterProgram(''); setFilterStage(''); setFilterStatus('')
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-forest)' }}>Enrollment</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--brand-slate)' }}>
          {enrolled.length} farmer{enrolled.length !== 1 ? 's' : ''} enrolled
        </p>
      </div>

      {/* Collapsible statistics */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => setStatsOpen(v => !v)}
          className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 hover:text-gray-700 transition-colors w-fit"
        >
          <ChevronRight className={cn('w-3.5 h-3.5 transition-transform', statsOpen && 'rotate-90')} />
          Statistics
        </button>
        {statsOpen && !loading && (
          <div className="grid grid-cols-4 lg:grid-cols-8 gap-2">
            {stageStats.map(s => {
              const Icon = s.icon
              const active = filterStage === String(s.stage)
              return (
                <button
                  key={s.stage}
                  onClick={() => setFilterStage(active ? '' : String(s.stage))}
                  className={cn(
                    'bg-white rounded-xl border p-3 text-center shadow-sm hover:shadow-md transition-all',
                    active ? 'ring-2' : 'border-gray-100',
                  )}
                  style={active ? { borderColor: 'var(--brand-dark)', boxShadow: '0 0 0 2px var(--brand-mint)' } : undefined}
                >
                  <Icon className="w-4 h-4 mx-auto mb-1" style={{ color: 'var(--brand-mid)' }} />
                  <p className="text-lg font-bold" style={{ color: 'var(--brand-dark)' }}>{s.count}</p>
                  <p className="text-[9px] text-gray-400 leading-tight">{s.name}</p>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-48">
          <SelectTemplate
            size="sm"
            options={[{ value: '', label: 'All programs' }, ...programs.map(p => ({ value: p.id, label: p.name }))]}
            value={filterProgram}
            onChange={e => setFilterProgram(e.target.value)}
          />
        </div>
        <div className="w-36">
          <SelectTemplate
            size="sm"
            options={[
              { value: '', label: 'All statuses' },
              { value: 'active', label: 'Active' },
              { value: 'withdrawn', label: 'Withdrawn' },
              { value: 'graduated', label: 'Graduated' },
            ]}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          />
        </div>
        {hasActiveFilter && (
          <button onClick={clearFilters} className="text-xs flex items-center gap-1 hover:underline" style={{ color: 'var(--brand-slate)' }}>
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-24 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20" style={{ color: 'var(--brand-slate)' }}>
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-medium" style={{ color: 'var(--brand-forest)' }}>No enrollments found</p>
          <p className="text-sm mt-1">Enroll farmers from the Registry page to see workflow here.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            {visible.map(f => {
              const enr = f.enrollment!
              const stageDef = WORKFLOW_STAGES.find(s => s.stage === enr.currentStage)
              const StageIcon = stageDef?.icon ?? Clock
              return (
                <div
                  key={f.id}
                  className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => setFocusFarmerId(f.id)}
                >
                  <PersonAvatar name={f.fullName} size={36} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm truncate" style={{ color: 'var(--brand-forest)' }}>{f.fullName}</p>
                      <BadgeTemplate label={enr.status} variant={STATUS_VARIANT[enr.status] ?? 'neutral'} size="sm" />
                    </div>
                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--brand-slate)' }}>
                      {enr.programName}{enr.cohortName ? ` · ${enr.cohortName}` : ''}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--brand-mid)' }}>{f.phone}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--brand-dark)' }}>
                      <StageIcon className="w-3.5 h-3.5" />
                      <span className="font-medium">{stageDef?.name}</span>
                    </div>
                    <p className="text-[10px] text-gray-400">Stage {enr.currentStage} of {WORKFLOW_STAGES.length}</p>
                    <div className="flex gap-0.5 mt-1">
                      {WORKFLOW_STAGES.map(s => (
                        <div key={s.stage} className={cn(
                          'w-3 h-1 rounded-full',
                          s.stage < enr.currentStage ? 'bg-emerald-400' : s.stage === enr.currentStage ? '' : 'bg-gray-200',
                        )} style={s.stage === enr.currentStage ? { backgroundColor: 'var(--brand-dark)' } : undefined} />
                      ))}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
                </div>
              )
            })}
          </div>
        </div>
      )}

      <EnrollmentDetailSheet
        farmer={focusFarmer}
        onClose={() => setFocusFarmerId(null)}
        onAdvance={advanceStage}
        onDecline={declineEnrollment}
      />
    </div>
  )
}
