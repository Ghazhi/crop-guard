'use client'

import { useState } from 'react'
import {
  FolderKanban,
  Users,
  Plus,
  Search,
  X,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Eye,
  Pencil,
  PowerOff,
  BarChart2,
  GitBranch,
} from 'lucide-react'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { CardTemplate } from '@/customComponents/CardTemplate'
import { PaginationBar } from '@/customComponents/PaginationBar'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { useToast } from '@/customComponents/ToastTemplate'
import { cn } from '@/lib/utils'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Program {
  id: string
  name: string
  season: string
  crops: string[]
  startDate: string
  endDate: string
  enrolled: number
  target: number
  status: 'Active' | 'Inactive' | 'Completed'
  cohortsCount: number
  partnerName: string
}

interface Cohort {
  id: string
  name: string
  program: string
  community: string
  enrolled: number
  target: number
  currentWeek: number
  totalWeeks: number
  compliance: number
  status: 'Active' | 'Completing' | 'Completed'
}

interface Farmer {
  id: string
  name: string
  community: string
  friScore: number
}

interface StaffMember {
  id: string
  name: string
  initials: string
  role: 'Field Agent' | 'Supervisor' | 'Data Officer'
  assignedProgram: string
  assignedCohorts: number
  zone: string
  status: 'Active' | 'On Leave'
}

let _seq = 1
function uid(prefix: string) { return `${prefix}-${Date.now()}-${_seq++}` }

// ─── Mock Data ────────────────────────────────────────────────────────────────

const INITIAL_PROGRAMS: Program[] = [
  { id: 'p1', name: 'Maize Intensification 2025A', season: '2025A', crops: ['Maize'], startDate: 'Jan 2025', endDate: 'Jun 2025', enrolled: 240, target: 260, status: 'Active', cohortsCount: 4, partnerName: 'AgriBank GH' },
  { id: 'p2', name: 'Rice Uplift Programme', season: '2025A', crops: ['Rice'], startDate: 'Feb 2025', endDate: 'Jul 2025', enrolled: 185, target: 200, status: 'Active', cohortsCount: 3, partnerName: 'MFI Capital' },
  { id: 'p3', name: 'Soy Value Chain', season: '2024B', crops: ['Soybean'], startDate: 'Aug 2024', endDate: 'Dec 2024', enrolled: 120, target: 120, status: 'Completed', cohortsCount: 2, partnerName: 'DevFund Ltd' },
  { id: 'p4', name: 'Cassava Processing Pilot', season: '2025A', crops: ['Cassava'], startDate: 'Mar 2025', endDate: 'Aug 2025', enrolled: 95, target: 150, status: 'Active', cohortsCount: 2, partnerName: 'AgriBank GH' },
  { id: 'p5', name: 'Multi-Crop Diversification', season: '2025A', crops: ['Maize', 'Soybean', 'Groundnut'], startDate: 'Jan 2025', endDate: 'Sep 2025', enrolled: 160, target: 180, status: 'Active', cohortsCount: 3, partnerName: 'GovGrant Fund' },
  { id: 'p6', name: 'Groundnut Cluster 2024B', season: '2024B', crops: ['Groundnut'], startDate: 'Jul 2024', endDate: 'Nov 2024', enrolled: 78, target: 80, status: 'Completed', cohortsCount: 1, partnerName: 'MFI Capital' },
  { id: 'p7', name: 'Tomato Market Linkage', season: '2025A', crops: ['Tomato'], startDate: 'Apr 2025', endDate: 'Oct 2025', enrolled: 14, target: 100, status: 'Inactive', cohortsCount: 0, partnerName: 'DevFund Ltd' },
  { id: 'p8', name: 'Cocoa Farmers Uplift', season: '2025A', crops: ['Cocoa'], startDate: 'Feb 2025', endDate: 'Nov 2025', enrolled: 0, target: 200, status: 'Inactive', cohortsCount: 0, partnerName: 'GovGrant Fund' },
]

const INITIAL_COHORTS: Cohort[] = [
  { id: 'c1', name: 'Kumasi North A', program: 'Maize Intensification 2025A', community: 'Kumasi North', enrolled: 48, target: 50, currentWeek: 10, totalWeeks: 12, compliance: 92, status: 'Completing' },
  { id: 'c2', name: 'Bekwai Cluster', program: 'Maize Intensification 2025A', community: 'Bekwai', enrolled: 52, target: 55, currentWeek: 7, totalWeeks: 12, compliance: 88, status: 'Active' },
  { id: 'c3', name: 'Obuasi East', program: 'Maize Intensification 2025A', community: 'Obuasi East', enrolled: 45, target: 50, currentWeek: 6, totalWeeks: 12, compliance: 79, status: 'Active' },
  { id: 'c4', name: 'Juaben Rice Cohort', program: 'Rice Uplift Programme', community: 'Juaben', enrolled: 60, target: 65, currentWeek: 11, totalWeeks: 12, compliance: 95, status: 'Completing' },
  { id: 'c5', name: 'Ejisu West Rice', program: 'Rice Uplift Programme', community: 'Ejisu West', enrolled: 55, target: 60, currentWeek: 8, totalWeeks: 12, compliance: 83, status: 'Active' },
  { id: 'c6', name: 'Soy Pilot Alpha', program: 'Soy Value Chain', community: 'Ashanti Central', enrolled: 60, target: 60, currentWeek: 12, totalWeeks: 12, compliance: 91, status: 'Completed' },
  { id: 'c7', name: 'Soy Pilot Beta', program: 'Soy Value Chain', community: 'Kwabre', enrolled: 60, target: 60, currentWeek: 12, totalWeeks: 12, compliance: 87, status: 'Completed' },
  { id: 'c8', name: 'Cassava Cluster 1', program: 'Cassava Processing Pilot', community: 'Mampong', enrolled: 45, target: 70, currentWeek: 3, totalWeeks: 12, compliance: 72, status: 'Active' },
  { id: 'c9', name: 'Cassava Cluster 2', program: 'Cassava Processing Pilot', community: 'Ejura', enrolled: 50, target: 80, currentWeek: 2, totalWeeks: 12, compliance: 68, status: 'Active' },
  { id: 'c10', name: 'Diversification A', program: 'Multi-Crop Diversification', community: 'Amansie West', enrolled: 55, target: 60, currentWeek: 9, totalWeeks: 12, compliance: 84, status: 'Active' },
  { id: 'c11', name: 'Diversification B', program: 'Multi-Crop Diversification', community: 'Bosomtwe', enrolled: 58, target: 60, currentWeek: 10, totalWeeks: 12, compliance: 89, status: 'Completing' },
  { id: 'c12', name: 'Groundnut Pilot 1', program: 'Groundnut Cluster 2024B', community: 'Sekyere', enrolled: 78, target: 80, currentWeek: 12, totalWeeks: 12, compliance: 94, status: 'Completed' },
]

const STAFF: StaffMember[] = [
  { id: 's1', name: 'Isaac Mensah', initials: 'IM', role: 'Supervisor', assignedProgram: 'Maize Intensification 2025A', assignedCohorts: 4, zone: 'Kumasi Metro', status: 'Active' },
  { id: 's2', name: 'Grace Owusu', initials: 'GO', role: 'Field Agent', assignedProgram: 'Maize Intensification 2025A', assignedCohorts: 2, zone: 'Bekwai', status: 'Active' },
  { id: 's3', name: 'Francis Adu', initials: 'FA', role: 'Field Agent', assignedProgram: 'Rice Uplift Programme', assignedCohorts: 2, zone: 'Juaben', status: 'Active' },
  { id: 's4', name: 'Patricia Asante', initials: 'PA', role: 'Data Officer', assignedProgram: 'Multi-Crop Diversification', assignedCohorts: 3, zone: 'Amansie West', status: 'Active' },
  { id: 's5', name: 'Emmanuel Boah', initials: 'EB', role: 'Field Agent', assignedProgram: 'Cassava Processing Pilot', assignedCohorts: 2, zone: 'Mampong', status: 'On Leave' },
  { id: 's6', name: 'Theresa Gyamfi', initials: 'TG', role: 'Field Agent', assignedProgram: 'Rice Uplift Programme', assignedCohorts: 1, zone: 'Ejisu West', status: 'Active' },
  { id: 's7', name: 'Bernard Osei', initials: 'BO', role: 'Supervisor', assignedProgram: 'Multi-Crop Diversification', assignedCohorts: 3, zone: 'Bosomtwe', status: 'Active' },
  { id: 's8', name: 'Linda Quansah', initials: 'LQ', role: 'Data Officer', assignedProgram: 'Maize Intensification 2025A', assignedCohorts: 4, zone: 'Obuasi East', status: 'Active' },
  { id: 's9', name: 'Michael Appiah', initials: 'MA', role: 'Field Agent', assignedProgram: 'Cassava Processing Pilot', assignedCohorts: 2, zone: 'Ejura', status: 'Active' },
  { id: 's10', name: 'Cecilia Ntow', initials: 'CN', role: 'Field Agent', assignedProgram: 'Multi-Crop Diversification', assignedCohorts: 1, zone: 'Kwabre', status: 'On Leave' },
]

const FARMER_POOL: Farmer[] = [
  { id: 'f1', name: 'Kwame Asante', community: 'Mampong', friScore: 74 },
  { id: 'f2', name: 'Abena Mensah', community: 'Ejura', friScore: 68 },
  { id: 'f3', name: 'Kofi Boateng', community: 'Kumasi North', friScore: 81 },
  { id: 'f4', name: 'Akua Owusu', community: 'Obuasi East', friScore: 59 },
  { id: 'f5', name: 'Yaw Darko', community: 'Bekwai', friScore: 77 },
  { id: 'f6', name: 'Ama Asare', community: 'Ejisu West', friScore: 65 },
  { id: 'f7', name: 'Kojo Frimpong', community: 'Kwabre', friScore: 88 },
  { id: 'f8', name: 'Efua Quaye', community: 'Juaben', friScore: 72 },
  { id: 'f9', name: 'Kwabena Acheampong', community: 'Mampong', friScore: 63 },
  { id: 'f10', name: 'Adwoa Nkrumah', community: 'Sekyere', friScore: 79 },
]

function farmersFor(cohort: Cohort): Farmer[] {
  const idx = Math.max(0, INITIAL_COHORTS.findIndex(c => c.id === cohort.id))
  const count = Math.min(6, cohort.enrolled)
  return Array.from({ length: count }, (_, i) => FARMER_POOL[(idx + i) % FARMER_POOL.length])
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusVariant(status: string): 'success' | 'info' | 'warning' | 'neutral' {
  if (status === 'Active')     return 'success'
  if (status === 'Completed')  return 'info'
  if (status === 'Completing') return 'warning'
  return 'neutral'
}

function StatusBadge({ status }: { status: string }) {
  return <BadgeTemplate label={status} variant={statusVariant(status)} size="sm" />
}

function OverviewCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-5 py-4">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-2">{label}</p>
      <p className="text-3xl font-bold" style={{ color: 'var(--brand-forest)' }}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  )
}

// ─── Cohort Farmers Sheet (enrolled farmers, like admin) ─────────────────────

function CohortFarmersSheet({ open, onClose, cohort }: {
  open: boolean
  onClose: () => void
  cohort: Cohort | null
}) {
  if (!cohort) return null
  const farmers = farmersFor(cohort)

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      title={`${cohort.name} — Farmers`}
      subtitle={`${cohort.community} · ${cohort.enrolled}/${cohort.target} enrolled`}
    >
      {farmers.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 text-center px-8 py-20">
          <Users className="w-10 h-10 text-gray-300" />
          <p className="text-sm font-semibold text-gray-500">No farmers enrolled yet</p>
          <p className="text-xs text-gray-400">
            Enroll farmers from the{' '}
            <span style={{ color: 'var(--brand-green)' }}>Farmer Management page</span>.
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          {farmers.map((f, i) => (
            <div key={`${f.id}-${i}`} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-gray-50 transition-colors">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 text-white" style={{ background: 'var(--brand-forest)' }}>
                {f.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold leading-tight truncate" style={{ color: 'var(--brand-forest)' }}>{f.name}</p>
                <p className="text-xs text-gray-400 mt-0.5">{f.community}</p>
              </div>
              <span className="text-xs font-bold shrink-0" style={{ color: 'var(--brand-forest)' }}>FRI {f.friScore}</span>
            </div>
          ))}
        </div>
      )}
    </SheetTemplate>
  )
}

// ─── Program Card (admin ProgramRow style) ────────────────────────────────────

function ProgramCard({ program, cohorts, staff, onUpdate, onAddCohort }: {
  program: Program
  cohorts: Cohort[]
  staff: StaffMember[]
  onUpdate: (updated: Program) => void
  onAddCohort: (data: { name: string; community: string; target: number }) => void
}) {
  const toast = useToast()
  const [programMode, setProgramMode] = useState<'view' | 'edit' | null>(null)
  const [cohortsOpen, setCohortsOpen] = useState(false)
  const [addCohortOpen, setAddCohortOpen] = useState(false)
  const [farmersCohort, setFarmersCohort] = useState<Cohort | null>(null)
  const isEdit = programMode === 'edit'

  const filled = Math.min(100, Math.round((program.enrolled / program.target) * 100))
  const isActive = program.status === 'Active'

  function handleToggleStatus() {
    const next: Program['status'] = isActive ? 'Inactive' : 'Active'
    onUpdate({ ...program, status: next })
    toast.success(`${program.name} ${next === 'Active' ? 'activated' : 'deactivated'}`)
  }

  return (
    <>
      <CardTemplate noPadding className="overflow-hidden">
        {/* Program body */}
        <div className={cn('px-6 pt-4 pb-3', !isActive && 'opacity-50 pointer-events-none')}>
          <div className="flex items-start justify-between gap-3 mb-1">
            <h3 className="text-base font-bold truncate" style={{ color: 'var(--brand-forest)' }}>{program.name}</h3>
            <BadgeTemplate label={program.status} variant={statusVariant(program.status)} size="sm" />
          </div>

          <p className="text-xs text-gray-400 mb-2">{program.season} · Partner: {program.partnerName}</p>

          <div className="flex flex-wrap gap-1.5 mb-3">
            {program.crops.map(crop => (
              <BadgeTemplate key={crop} label={crop} variant="success" size="sm" />
            ))}
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 shrink-0">{program.startDate} – {program.endDate}</span>
            <span className="flex items-center gap-1 text-xs shrink-0" style={{ color: 'var(--brand-dark)' }}>
              <Users className="w-3.5 h-3.5" />
              {program.enrolled} / {program.target}
            </span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all" style={{ width: `${filled}%`, backgroundColor: 'var(--brand-green)' }} />
            </div>
            <span className="text-xs text-gray-400 tabular-nums shrink-0">{filled}%</span>
          </div>
        </div>

        {/* Actions bar */}
        <div className="flex items-center justify-between px-6 py-2.5 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <ButtonTemplate
              variant="outline" size="sm" isIcon tooltip="View"
              leftIcon={<Eye className="w-3.5 h-3.5" />}
              onClick={() => setProgramMode('view')}
            />
            <ButtonTemplate
              variant="outline" size="sm" isIcon tooltip={isActive ? 'Deactivate' : 'Activate'}
              leftIcon={<PowerOff className="w-3.5 h-3.5" />}
              onClick={handleToggleStatus}
            />
          </div>
          <div className={cn('flex items-center gap-2', !isActive && 'opacity-50 pointer-events-none')}>
            <ButtonTemplate variant="outline" size="sm" isIcon={false}
              leftIcon={<GitBranch className="w-3.5 h-3.5" />}
              label={`Cohorts (${cohorts.length})`}
              onClick={() => setCohortsOpen(true)} />
            <ButtonTemplate
              variant="primary" size="sm"
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              label="Add Cohort"
              onClick={() => setAddCohortOpen(true)}
            />
          </div>
        </div>
      </CardTemplate>

      {/* View / Edit Sheet */}
      <SheetTemplate
        open={programMode !== null}
        onClose={() => setProgramMode(null)}
        title={isEdit ? `Edit: ${program.name}` : program.name}
        subtitle={isEdit ? 'Update program details' : program.season}
        headerExtra={!isEdit && (
          <div className="flex items-center gap-2">
            <BadgeTemplate label={program.status} variant={statusVariant(program.status)} size="sm" />
            <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit"
              leftIcon={<Pencil className="w-3.5 h-3.5" />}
              onClick={() => setProgramMode('edit')} />
          </div>
        )}
        footer={isEdit && (
          <>
            <button onClick={() => setProgramMode('view')} className="h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => { toast.success(`Program "${program.name}" updated`); setProgramMode('view') }} className="h-10 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--brand-forest)' }}>Save Changes</button>
          </>
        )}
      >
        {!isEdit ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                ['Partner', program.partnerName],
                ['Season', program.season],
                ['Start', program.startDate],
                ['End', program.endDate],
                ['Cohorts', String(cohorts.length)],
              ].map(([label, val]) => (
                <div key={String(label)} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-400 mb-1">{label}</p>
                  <div className="text-sm font-medium text-gray-800">{val}</div>
                </div>
              ))}
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-1">Enrollment</p>
              <p className="text-sm font-medium text-gray-800">{program.enrolled} / {program.target} farmers</p>
              <div className="mt-1.5 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${filled}%`, backgroundColor: 'var(--brand-green)' }} />
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-3">
              <p className="text-xs text-gray-400 mb-2">Crops</p>
              <div className="flex flex-wrap gap-1.5">
                {program.crops.map(c => (
                  <BadgeTemplate key={c} label={c} variant="success" size="sm" />
                ))}
              </div>
            </div>
            {staff.length > 0 && (
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs text-gray-400 mb-2">Program Staff</p>
                <div className="space-y-2">
                  {staff.map(s => (
                    <div key={s.id} className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 text-white" style={{ background: 'var(--brand-forest)' }}>{s.initials}</div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{s.name}</p>
                        <p className="text-[10px] text-gray-400">{s.role} · {s.zone}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>Program Name</label>
              <input defaultValue={program.name} className="h-10 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>Season</label>
              <input defaultValue={program.season} className="h-10 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>Start Date</label>
                <input type="date" className="h-10 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>End Date</label>
                <input type="date" className="h-10 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>Target Enrollment</label>
                <input type="number" defaultValue={program.target} className="h-10 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>Status</label>
                <select defaultValue={program.status} className="h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-200">
                  {['Active', 'Inactive', 'Completed'].map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </div>
        )}
      </SheetTemplate>

      {/* Cohorts Sheet */}
      <SheetTemplate
        open={cohortsOpen}
        onClose={() => setCohortsOpen(false)}
        title={`${program.name} — Cohorts`}
        subtitle={`${cohorts.length} cohort${cohorts.length !== 1 ? 's' : ''}`}
        footer={
          <div className="col-span-2">
            <ButtonTemplate variant="primary" fullWidth
              leftIcon={<Plus className="w-4 h-4" />}
              label="Add Cohort"
              onClick={() => { setCohortsOpen(false); setAddCohortOpen(true) }}
            />
          </div>
        }
      >
        {cohorts.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-400">No cohorts yet.</div>
        ) : (
          <div className="-mx-2">
            {cohorts.map(cohort => {
              const cohortFilled = Math.min(100, Math.round((cohort.enrolled / cohort.target) * 100))
              return (
                <div key={cohort.id} className="border-b border-gray-100 last:border-0 px-2">
                  <div className="flex items-center gap-2.5 pt-3 pb-1">
                    <GitBranch className="w-3.5 h-3.5 shrink-0 text-gray-400" />
                    <p className="flex-1 text-sm font-bold min-w-0 truncate text-gray-800">{cohort.name}</p>
                    <StatusBadge status={cohort.status} />
                    <ButtonTemplate
                      variant="ghost" size="sm" isIcon
                      leftIcon={<Users className="w-3.5 h-3.5" />}
                      className="text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200"
                      tooltip="View farmers"
                      onClick={() => setFarmersCohort(cohort)}
                    />
                  </div>
                  <div className="pl-6 pb-1 flex items-center gap-2 text-xs text-gray-600">
                    <span>{cohort.community}</span>
                    <span className="text-gray-300">·</span>
                    <span className="tabular-nums">W{cohort.currentWeek}/{cohort.totalWeeks}</span>
                    <span className="text-gray-300">·</span>
                    <span className={cn('font-semibold', cohort.compliance >= 85 ? 'text-green-600' : cohort.compliance >= 70 ? 'text-amber-600' : 'text-red-500')}>
                      {cohort.compliance}% compliance
                    </span>
                  </div>
                  <div className="flex items-center gap-3 pl-6 pb-3">
                    <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${cohortFilled}%`, backgroundColor: 'var(--brand-green)' }} />
                    </div>
                    <span className="text-xs font-semibold text-gray-700 tabular-nums shrink-0">{cohort.enrolled} / {cohort.target}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </SheetTemplate>

      {/* Add Cohort Sheet */}
      <AddCohortSheet
        open={addCohortOpen}
        onClose={() => setAddCohortOpen(false)}
        onSave={data => { onAddCohort(data); toast.success(`Cohort "${data.name}" added`) }}
      />

      <CohortFarmersSheet
        open={!!farmersCohort}
        onClose={() => setFarmersCohort(null)}
        cohort={farmersCohort}
      />
    </>
  )
}

// ─── Add Cohort Sheet ─────────────────────────────────────────────────────────

function AddCohortSheet({ open, onClose, onSave }: {
  open: boolean
  onClose: () => void
  onSave: (data: { name: string; community: string; target: number }) => void
}) {
  const [name, setName] = useState('')
  const [community, setCommunity] = useState('')
  const [target, setTarget] = useState('50')

  function handleSave() {
    if (!name.trim() || !community.trim()) return
    onSave({ name: name.trim(), community: community.trim(), target: Number(target) || 50 })
    setName(''); setCommunity(''); setTarget('50')
    onClose()
  }

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      title="Add Cohort"
      subtitle="Register a new cohort for this program"
      footer={
        <>
          <button onClick={onClose} className="h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!name.trim() || !community.trim()}
            className="h-10 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: 'var(--brand-forest)' }}>Add Cohort</button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>Cohort Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Ashanti Batch A"
            className="h-10 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>Community</label>
          <input value={community} onChange={e => setCommunity(e.target.value)} placeholder="e.g. Kumasi North"
            className="h-10 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>Target Enrollment</label>
          <input type="number" value={target} onChange={e => setTarget(e.target.value)}
            className="h-10 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
        </div>
      </div>
    </SheetTemplate>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function Main() {
  const [programs, setPrograms] = useState<Program[]>(INITIAL_PROGRAMS)
  const [cohorts,  setCohorts]  = useState<Cohort[]>(INITIAL_COHORTS)
  const [statsOpen, setStatsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [programFilter, setProgramFilter] = useState('')
  const [cohortFilter, setCohortFilter] = useState('')
  const [staffFilter, setStaffFilter] = useState('')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [createOpen, setCreateOpen] = useState(false)

  const activeFilterCount = [programFilter, cohortFilter, staffFilter].filter(Boolean).length

  function handleUpdateProgram(updated: Program) {
    setPrograms(prev => prev.map(p => p.id === updated.id ? updated : p))
  }

  function handleAddCohort(programName: string, data: { name: string; community: string; target: number }) {
    const newCohort: Cohort = {
      id: uid('coh'),
      name: data.name,
      program: programName,
      community: data.community,
      enrolled: 0,
      target: data.target,
      currentWeek: 0,
      totalWeeks: 12,
      compliance: 0,
      status: 'Active',
    }
    setCohorts(prev => [...prev, newCohort])
  }

  // cascade: cohort & staff options narrow when a program is selected
  const cohortOptions = programFilter ? cohorts.filter(c => c.program === programFilter) : cohorts
  const staffOptions = programFilter ? STAFF.filter(s => s.assignedProgram === programFilter) : STAFF

  const filtered = programs.filter(p => {
    if (search && !p.name.toLowerCase().includes(search.toLowerCase()) && !p.partnerName.toLowerCase().includes(search.toLowerCase())) return false
    if (programFilter && p.name !== programFilter) return false
    if (cohortFilter && !cohorts.some(c => c.name === cohortFilter && c.program === p.name)) return false
    if (staffFilter && !STAFF.some(s => s.name === staffFilter && s.assignedProgram === p.name)) return false
    return true
  })

  const paginated = pageSize === 0 ? filtered : filtered.slice((page - 1) * pageSize, (page - 1) * pageSize + pageSize)

  const activePrograms = programs.filter(p => p.status === 'Active').length
  const totalEnrolled = programs.reduce((s, p) => s + p.enrolled, 0)
  const activeCohorts = cohorts.filter(c => c.status === 'Active').length
  const avgCompliance = Math.round(cohorts.reduce((s, c) => s + c.compliance, 0) / cohorts.length)

  return (
    <div className="p-6 space-y-4">

      {/* Page Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <FolderKanban className="w-5 h-5" style={{ color: 'var(--brand-forest)' }} />
            <h1 className="text-xl font-bold text-gray-900">Programs &amp; Cohorts</h1>
          </div>
          <p className="text-sm mt-0.5" style={{ color: 'var(--brand-slate)' }}>
            {programs.length} programs · {cohorts.length} cohorts
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
          <ButtonTemplate
            variant="primary" size="md"
            leftIcon={<Plus className="w-4 h-4" />}
            label="New Program"
            onClick={() => setCreateOpen(true)}
          />
        </div>
      </div>

      {/* Overview stats */}
      {statsOpen && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          <OverviewCard label="Total Programs" value={programs.length} />
          <OverviewCard label="Active Programs" value={activePrograms} />
          <OverviewCard label="Active Cohorts" value={activeCohorts} sub={`${cohorts.length} total`} />
          <OverviewCard label="Total Enrollment" value={totalEnrolled.toLocaleString()} />
          <OverviewCard label="Avg Compliance" value={`${avgCompliance}%`} sub={avgCompliance >= 85 ? 'On track' : 'Needs attention'} />
          <OverviewCard label="Avg FRI Score" value="74.2" sub="+2.1 pts this week" />
        </div>
      )}

      {/* Filters card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              className="w-full border border-gray-200 rounded-lg pl-10 pr-9 h-10 text-sm focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark) transition-colors"
              placeholder="Search programs…"
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setFiltersOpen(v => !v)}
            className={cn(
              'flex items-center gap-1.5 h-10 px-3 rounded-lg border text-sm font-medium transition-colors shrink-0',
              filtersOpen || activeFilterCount > 0
                ? 'border-(--brand-green) text-(--brand-green) bg-green-50'
                : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700',
            )}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Filters
            {activeFilterCount > 0 && (
              <span className="ml-0.5 w-4 h-4 rounded-full text-[10px] font-bold flex items-center justify-center text-white" style={{ backgroundColor: 'var(--brand-green)' }}>{activeFilterCount}</span>
            )}
            <ChevronDown className={cn('w-3.5 h-3.5 transition-transform', filtersOpen && 'rotate-180')} />
          </button>
        </div>
        {filtersOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-gray-100">
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Program</p>
              <select
                value={programFilter}
                onChange={e => { setProgramFilter(e.target.value); setCohortFilter(''); setStaffFilter(''); setPage(1) }}
                className="h-8 w-full border border-gray-200 rounded-lg px-2.5 text-xs focus:outline-none bg-white"
              >
                <option value="">All programs</option>
                {programs.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Cohort</p>
              <select
                value={cohortFilter}
                onChange={e => { setCohortFilter(e.target.value); setPage(1) }}
                className="h-8 w-full border border-gray-200 rounded-lg px-2.5 text-xs focus:outline-none bg-white"
              >
                <option value="">All cohorts</option>
                {cohortOptions.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Program Staff</p>
              <select
                value={staffFilter}
                onChange={e => { setStaffFilter(e.target.value); setPage(1) }}
                className="h-8 w-full border border-gray-200 rounded-lg px-2.5 text-xs focus:outline-none bg-white"
              >
                <option value="">All staff</option>
                {staffOptions.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Pagination (top) */}
      {filtered.length > 0 && (
        <PaginationBar
          page={page}
          pageSize={pageSize}
          total={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={ps => { setPageSize(ps); setPage(1) }}
          className="px-1"
        />
      )}

      {/* Program cards */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 flex flex-col items-center gap-2 py-16 text-gray-400">
          <FolderKanban className="w-8 h-8 opacity-30" />
          <p className="text-sm">No programs found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginated.map(program => (
            <ProgramCard
              key={program.id}
              program={program}
              cohorts={cohorts.filter(c => c.program === program.name)}
              staff={STAFF.filter(s => s.assignedProgram === program.name)}
              onUpdate={handleUpdateProgram}
              onAddCohort={data => handleAddCohort(program.name, data)}
            />
          ))}
        </div>
      )}

      {/* Create Program Sheet */}
      <SheetTemplate
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Program"
        subtitle="Create a new program"
        footer={
          <div className="grid grid-cols-2 gap-3">
            <button onClick={() => setCreateOpen(false)} className="h-10 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">Cancel</button>
            <button onClick={() => setCreateOpen(false)} className="h-10 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90" style={{ backgroundColor: 'var(--brand-forest)' }}>Create Program</button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>Program Name</label>
            <input placeholder="e.g. Maize Intensification 2025B" className="h-10 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>Season</label>
            <input placeholder="e.g. 2025B" className="h-10 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>Start Date</label>
              <input type="date" className="h-10 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>End Date</label>
              <input type="date" className="h-10 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>Target Enrollment</label>
            <input type="number" placeholder="100" className="h-10 border border-gray-200 rounded-lg px-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-200" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>Partner</label>
            <select className="h-10 border border-gray-200 rounded-lg px-3 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-200">
              <option value="">Select a partner</option>
              {Array.from(new Set(programs.map(p => p.partnerName))).map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
        </div>
      </SheetTemplate>
    </div>
  )
}
