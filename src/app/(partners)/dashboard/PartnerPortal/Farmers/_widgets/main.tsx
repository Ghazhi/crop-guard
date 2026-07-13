'use client'

import { useState } from 'react'
import {
  ChevronUp, Users, GitBranch,
  Calendar, Wheat, Layers, TrendingUp, Search, X, BarChart2,
  LayoutGrid, List, Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { usePersistedState } from '@/lib/usePersistedState'
import { PaginationBar } from '@/customComponents/PaginationBar'
import { CardTemplate }  from '@/customComponents/CardTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { PROGRAMS }      from '@/dataCenter/programs'
import { FARMERS_LIST }  from '@/dataCenter/farmerManagement'
import { PersonAvatar }  from '@/customComponents/PersonAvatar'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { DatagridTemplate } from '@/customComponents/DatagridTemplate'
import type { DatagridColumn } from '@/customComponents/DatagridTemplate'
import type { Program, Cohort } from '@/app/(admin)/dashboard/ProgramsSetup/_logics/interface'
import type { Farmer }   from '@/app/(admin)/dashboard/FarmersRegistry/_logics/interface'
import { usePartnerId }  from '../../_logics/usePartnerId'
import { StatCard }      from '../../_components/StatCard'
import { pct }           from '../../_logics/chartUtils'

// ── helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  const d = new Date(iso)
  return `${d.getMonth() + 1}/${d.getDate()}/${d.getFullYear()}`
}

// ── Cohort farmers sheet ───────────────────────────────────────────────────────
interface FarmerRow {
  id:          string
  fullName:    string
  phone:       string
  community:   string
  district:    string
  primaryCrop: string
  currentFri:  string
}

const FARMER_COLS: DatagridColumn<FarmerRow>[] = [
  { key: 'fullName',    label: 'Farmer',      render: (_v, r) => (
    <div className="flex items-center gap-2">
      <PersonAvatar name={r.fullName} size={26} />
      <span className="font-medium text-gray-800">{r.fullName}</span>
    </div>
  )},
  { key: 'community',  label: 'Community'  },
  { key: 'district',   label: 'District'   },
  { key: 'primaryCrop', label: 'Crop', render: v => (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">{v as string}</span>
  )},
  { key: 'currentFri', label: 'FRI', render: v => {
    const n = parseFloat(v as string)
    const color = n >= 70 ? '#15803d' : n >= 55 ? '#b45309' : '#dc2626'
    return <span className="font-bold text-sm" style={{ color }}>{v}</span>
  }},
]

function CohortFarmersSheet({ open, onClose, cohort, programName }: {
  open: boolean
  onClose: () => void
  cohort: Cohort | null
  programName: string
}) {
  if (!cohort) return null
  const allFarmers = FARMERS_LIST as Farmer[]
  const rows: FarmerRow[] = allFarmers
    .filter(f => f.enrollment?.cohortId === cohort.id)
    .map(f => ({
      id:          f.id,
      fullName:    f.fullName,
      phone:       f.phone,
      community:   f.community,
      district:    f.district,
      primaryCrop: f.primaryCrop,
      currentFri:  f.currentFri !== null ? f.currentFri.toFixed(1) : '—',
    }))

  return (
    <SheetTemplate open={open} onClose={onClose} title={cohort.name} subtitle={programName} size="xl" bodyClassName="p-4">
      <DatagridTemplate
        columns={FARMER_COLS}
        data={rows}
        rowKey="id"
        defaultPageSize={10}
        emptyLabel="No farmers enrolled in this cohort"
      />
    </SheetTemplate>
  )
}

// ── Cohort row ─────────────────────────────────────────────────────────────────
function CohortRow({ cohort, programName }: { cohort: Cohort; programName: string }) {
  const [farmersOpen, setFarmersOpen] = useState(false)
  const filled   = pct(cohort.enrolledCount, cohort.targetCount)
  const isActive = cohort.status === 'Active'

  return (
    <>
      <div className={['border-t transition-colors', !isActive && 'opacity-50'].join(' ')}
           style={{ borderColor: '#e5e7eb' }}>
        <div className="flex items-center gap-2.5 px-5 pt-3 pb-1">
          <GitBranch className="w-3.5 h-3.5 shrink-0 mt-0.5 text-gray-400" />
          <p className="flex-1 text-sm font-bold min-w-0 truncate text-gray-800">{cohort.name}</p>
          <div className="flex items-center gap-1 shrink-0">
            <ButtonTemplate
              variant="ghost" size="sm" isIcon
              leftIcon={<Users className="w-3.5 h-3.5" />}
              className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200"
              title="View farmers"
              onClick={() => setFarmersOpen(true)}
            />
          </div>
        </div>
        <div className="px-5 pl-7.5 pb-2 flex items-center gap-1.5 flex-wrap">
          <span className="text-xs text-gray-600">{cohort.region} · {cohort.district}</span>
          {cohort.agentName ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-white"
                  style={{ backgroundColor: 'var(--brand-forest)' }}>
              {cohort.agentName}
            </span>
          ) : (
            <span className="text-xs text-gray-400 italic">No agent</span>
          )}
        </div>
        <div className="flex items-center gap-3 px-5 pl-7.5 pb-3">
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${filled}%`, backgroundColor: 'var(--brand-green)' }} />
          </div>
          <span className="text-xs font-semibold text-gray-700 tabular-nums shrink-0">
            {cohort.enrolledCount} / {cohort.targetCount}
          </span>
        </div>
      </div>

      <CohortFarmersSheet
        open={farmersOpen}
        onClose={() => setFarmersOpen(false)}
        cohort={cohort}
        programName={programName}
      />
    </>
  )
}

// ── Program detail sheet (read-only view) ──────────────────────────────────────
function ProgramDetailSheet({ open, onClose, program }: {
  open: boolean
  onClose: () => void
  program: Program | null
}) {
  if (!program) return null
  const totalEnrolled = program.cohorts.reduce((s, c) => s + c.enrolledCount, program.enrolledCount)
  const filled        = pct(totalEnrolled, program.targetCount)
  const statusVariant = program.status === 'Active' ? 'success' : program.status === 'Completed' ? 'info' : 'neutral'

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      title={program.name}
      subtitle={program.season}
      headerExtra={<BadgeTemplate label={program.status} variant={statusVariant} size="sm" />}
    >
      <div className="p-5 space-y-4">
        {program.description && <p className="text-sm text-gray-600 leading-relaxed">{program.description}</p>}
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <Calendar className="w-4 h-4 shrink-0" style={{ color: 'var(--brand-mid)' }} />
          <span>{fmtDate(program.startDate)} – {fmtDate(program.endDate)}</span>
        </div>
        {program.crops.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {program.crops.map(crop => (
              <BadgeTemplate key={crop} label={crop} variant="success" size="sm" />
            ))}
          </div>
        )}
        <div className="rounded-xl border border-gray-100 p-4 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium" style={{ color: 'var(--brand-forest)' }}>Enrollment</span>
            <span className="text-gray-400 tabular-nums">{totalEnrolled} / {program.targetCount}</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full" style={{ width: `${filled}%`, backgroundColor: 'var(--brand-green)' }} />
          </div>
          <p className="text-xs text-gray-400">{filled}% of target reached</p>
        </div>
      </div>
    </SheetTemplate>
  )
}

// ── Cohorts sheet ───────────────────────────────────────────────────────────────
function CohortsSheet({ open, onClose, program }: {
  open: boolean
  onClose: () => void
  program: Program | null
}) {
  if (!program) return null

  return (
    <SheetTemplate open={open} onClose={onClose} title={`${program.name} — Cohorts`}
      subtitle={`${program.cohorts.length} cohort${program.cohorts.length !== 1 ? 's' : ''}`}>
      {program.cohorts.length === 0 ? (
        <div className="py-16 text-center text-sm text-gray-400">No cohorts in this program.</div>
      ) : (
        program.cohorts.map(cohort => (
          <CohortRow key={cohort.id} cohort={cohort} programName={program.name} />
        ))
      )}
    </SheetTemplate>
  )
}

// ── Program card ───────────────────────────────────────────────────────────────
function ProgramCard({ program }: { program: Program }) {
  const [viewOpen, setViewOpen] = useState(false)
  const [cohortsOpen, setCohortsOpen] = useState(false)
  const totalEnrolled = program.cohorts.reduce((s, c) => s + c.enrolledCount, program.enrolledCount)
  const filled        = pct(totalEnrolled, program.targetCount)
  const isActive      = program.status === 'Active'
  const statusVariant = program.status === 'Active' ? 'success' : program.status === 'Completed' ? 'info' : 'neutral'

  return (
    <>
      <CardTemplate noPadding className="overflow-hidden">
        <div className={['px-6 pt-4 pb-3', !isActive && 'opacity-60'].join(' ')}>
          <div className="flex items-start justify-between gap-3 mb-1">
            <h3 className="text-base font-bold truncate" style={{ color: 'var(--brand-forest)' }}>
              {program.name}
            </h3>
            <BadgeTemplate label={program.status} variant={statusVariant} size="sm" />
          </div>

          <p className="text-xs text-gray-400 mb-1">{program.season}</p>
          {program.description && (
            <p className="text-sm text-gray-500 mb-2 leading-snug">{program.description}</p>
          )}

          <div className="flex flex-wrap gap-1.5 mb-3">
            {program.crops.map(crop => (
              <BadgeTemplate key={crop} label={crop} variant="success" size="sm" />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {fmtDate(program.startDate)} – {fmtDate(program.endDate)}
            </span>
            <span className="flex items-center gap-1 text-xs shrink-0" style={{ color: 'var(--brand-dark)' }}>
              <Users className="w-3.5 h-3.5" />
              {totalEnrolled} / {program.targetCount}
            </span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all"
                   style={{ width: `${filled}%`, backgroundColor: 'var(--brand-green)' }} />
            </div>
            <span className="text-xs text-gray-400 tabular-nums shrink-0">{filled}%</span>
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-between px-6 py-2.5 border-t border-gray-100">
          <ButtonTemplate variant="outline" size="sm" isIcon tooltip="View"
            leftIcon={<Eye className="w-3.5 h-3.5" />}
            onClick={() => setViewOpen(true)} />
          <ButtonTemplate variant="outline" size="sm" isIcon={false}
            leftIcon={<GitBranch className="w-3.5 h-3.5" />}
            label={`Cohorts (${program.cohorts.length})`}
            onClick={() => setCohortsOpen(true)} />
        </div>
      </CardTemplate>

      <ProgramDetailSheet open={viewOpen} onClose={() => setViewOpen(false)} program={program} />
      <CohortsSheet open={cohortsOpen} onClose={() => setCohortsOpen(false)} program={program} />
    </>
  )
}

// ── Program list row (list view, admin ProgramListRow style) ──────────────────
function ProgramListRow({ program }: { program: Program }) {
  const [viewOpen, setViewOpen] = useState(false)
  const [cohortsOpen, setCohortsOpen] = useState(false)
  const totalEnrolled = program.cohorts.reduce((s, c) => s + c.enrolledCount, program.enrolledCount)
  const filled        = pct(totalEnrolled, program.targetCount)
  const isActive      = program.status === 'Active'
  const statusVariant = program.status === 'Active' ? 'success' : program.status === 'Completed' ? 'info' : 'neutral'

  return (
    <>
      <div className={cn(
        'flex items-center gap-4 px-5 py-4 border-b border-gray-100 hover:bg-gray-50/60 transition-colors',
        !isActive && 'opacity-60'
      )}>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setViewOpen(true)}>
          <div className="flex items-center gap-2 min-w-0">
            <p className="font-semibold text-sm truncate" style={{ color: 'var(--brand-forest)' }}>{program.name}</p>
            <BadgeTemplate label={program.status} variant={statusVariant} size="sm" />
          </div>
          <p className="text-xs text-gray-400 mt-0.5">{program.season}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-400 tabular-nums">{program.cohorts.length} cohort{program.cohorts.length !== 1 ? 's' : ''}</span>
          <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${filled}%`, backgroundColor: 'var(--brand-green)' }} />
          </div>
          <span className="text-xs text-gray-500 tabular-nums shrink-0">{totalEnrolled}/{program.targetCount}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <ButtonTemplate variant="outline" size="sm" isIcon tooltip="View"
            leftIcon={<Eye className="w-3.5 h-3.5" />}
            onClick={() => setViewOpen(true)} />
          <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Cohorts"
            leftIcon={<GitBranch className="w-3.5 h-3.5" />}
            onClick={() => setCohortsOpen(true)} />
        </div>
      </div>

      <ProgramDetailSheet open={viewOpen} onClose={() => setViewOpen(false)} program={program} />
      <CohortsSheet open={cohortsOpen} onClose={() => setCohortsOpen(false)} program={program} />
    </>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export function Main() {
  const partnerId = usePartnerId()
  const [statsOpen, setStatsOpen] = useState(false)
  const [viewMode, setViewMode] = usePersistedState<'card' | 'list'>('partnerPrograms-view', 'card')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)

  const programs = PROGRAMS.filter(p => p.partnerId === partnerId)

  const totalEnrolled = programs.reduce((s, p) =>
    s + p.cohorts.reduce((cs: number, c: Cohort) => cs + c.enrolledCount, p.enrolledCount), 0)
  const activeCount   = programs.filter(p => p.status === 'Active').length

  const filtered = programs.filter(p => !search.trim() || p.name.toLowerCase().includes(search.toLowerCase()))
  const paginated = pageSize === 0 ? filtered : filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="min-h-screen bg-(--brand-gray) p-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--brand-forest)' }}>Linked Programs</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--brand-dark)' }}>
            {programs.length} program{programs.length === 1 ? '' : 's'} linked to your organisation
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <ButtonTemplate
            variant="secondary" size="md"
            leftIcon={<BarChart2 className="w-3.5 h-3.5" />}
            rightIcon={<ChevronUp className={cn('w-3.5 h-3.5 transition-transform', !statsOpen && 'rotate-180')} />}
            label="Overview"
            onClick={() => setStatsOpen(v => !v)}
          />
          <div className="flex gap-0.5 p-1 rounded-lg border border-gray-200 bg-gray-50">
            <button onClick={() => setViewMode('card')} title="Card view"
              className="p-1.5 rounded-md transition-colors"
              style={viewMode === 'card' ? { backgroundColor: 'white', color: 'var(--brand-forest)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : { color: '#9ca3af' }}>
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button onClick={() => setViewMode('list')} title="List view"
              className="p-1.5 rounded-md transition-colors"
              style={viewMode === 'list' ? { backgroundColor: 'white', color: 'var(--brand-forest)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' } : { color: '#9ca3af' }}>
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Overview stats */}
      {statsOpen && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <StatCard icon={<Layers className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />}    label="Programs"  value={programs.length} />
          <StatCard icon={<TrendingUp className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />} label="Active"    value={activeCount} />
          <StatCard icon={<Users className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />}      label="Farmers"   value={totalEnrolled} />
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          className="w-full border border-gray-200 rounded-xl pl-10 pr-9 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark) transition-colors bg-white"
          placeholder="Search programs…"
          value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
          </button>
        )}
      </div>

      {/* Pagination (top) */}
      {filtered.length > 0 && (
        <PaginationBar
          page={page} pageSize={pageSize} total={filtered.length}
          onPageChange={setPage} onPageSizeChange={ps => { setPageSize(ps); setPage(1) }}
        />
      )}

      {/* Program cards */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-2 text-center">
          <Wheat className="w-8 h-8 text-gray-300" />
          <p className="text-sm text-gray-400">
            {search ? 'No programs match your search.' : 'No programs linked to your organisation'}
          </p>
        </div>
      ) : viewMode === 'card' ? (
        <div className="space-y-4">
          {paginated.map(prog => <ProgramCard key={prog.id} program={prog} />)}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {paginated.map(prog => <ProgramListRow key={prog.id} program={prog} />)}
        </div>
      )}
    </div>
  )
}
