'use client'

import { useState, useMemo } from 'react'
import {
  Landmark, Users2, CalendarDays, Gavel, ShieldCheck, Wallet, FileText,
  Plus, Pencil, Trash2, Search, MapPin, ChevronLeft, ChevronRight, Sprout,
  Globe2, Truck, Sparkles, AlertCircle, CheckCircle2, XCircle, TrendingUp,
  Download, RefreshCw,
} from 'lucide-react'
import { Main as CommunityProfileMain } from '@/app/(admin)/dashboard/CommunityProfile/_widgets/main'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { SelectTemplate } from '@/customComponents/SelectTemplate'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { ConfirmModal } from '@/customComponents/ConfirmModal'
import { CheckboxTemplate } from '@/customComponents/CheckboxTemplate'
import { DatagridTemplate } from '@/customComponents/DatagridTemplate'
import type { DatagridColumn } from '@/customComponents/DatagridTemplate'
import { usePersistedState } from '@/lib/usePersistedState'
import { COOPERATIVES, type Cooperative, type CooperativeStatus } from '@/dataCenter/cooperatives'
import { FARMERS_LIST } from '@/dataCenter/farmerManagement'
import { FARMER_COOPERATIVE_MAP } from '@/dataCenter/farmerCooperatives'
import { cn } from '@/lib/utils'
import type {
  GovTab, Officer, OfficerRole, Meeting, MeetingType,
  Resolution, VoteOutcome, ImplementationStatus,
  ComplianceItem, CertificationType, ComplianceStatus,
  FundTransaction, FundTransactionType, PaymentMode,
  GovernanceDocument, DocumentType, TraceabilityRecord,
} from '../_logics/interface'

// ─── Seed data for sub-tabs ────────────────────────────────────────────────────

const SEED_OFFICERS: Officer[] = [
  { id: 'off-001', cooperativeId: 'coop-001', name: 'Kwabena Owusu', role: 'Chairman',       phone: '024-111-2222', termStart: '2023-01', termEnd: '2026-01', isActive: true },
  { id: 'off-002', cooperativeId: 'coop-001', name: 'Efua Adjei',    role: 'Secretary',       phone: '020-333-4444', termStart: '2023-01', termEnd: '2026-01', isActive: true },
  { id: 'off-003', cooperativeId: 'coop-002', name: 'Alhassan Mahama', role: 'Chairman',      phone: '054-555-6666', termStart: '2022-06', termEnd: '2025-06', isActive: true },
]

const SEED_MEETINGS: Meeting[] = [
  { id: 'mtg-001', cooperativeId: 'coop-001', meetingType: 'AGM',       meetingDate: '2026-01-15', attendanceCount: 118, agenda: 'Annual review, election of officers', minutes: 'Officers re-elected unanimously.' },
  { id: 'mtg-002', cooperativeId: 'coop-001', meetingType: 'Executive', meetingDate: '2026-03-02', attendanceCount: 8,   agenda: 'Fund allocation for input subsidy', minutes: 'Approved GHS 12,000 for seed inputs.' },
]

const SEED_RESOLUTIONS: Resolution[] = [
  { id: 'res-001', cooperativeId: 'coop-001', meetingId: 'mtg-001', title: 'Adopt group input procurement', description: 'Bulk-buy seed and fertilizer through the cooperative to reduce cost per member.', voteOutcome: 'Passed', implementationStatus: 'In Progress', datePassed: '2026-01-15' },
]

const SEED_COMPLIANCE: ComplianceItem[] = [
  { id: 'cmp-001', cooperativeId: 'coop-001', certificationType: 'Fair Trade', issueDate: '2024-05-01', expiryDate: '2027-05-01', status: 'Valid' },
  { id: 'cmp-002', cooperativeId: 'coop-006', certificationType: 'COCOBOD License', issueDate: '2023-02-10', expiryDate: '2026-02-10', status: 'Expiring Soon' },
]

const SEED_FUNDS: FundTransaction[] = [
  { id: 'fnd-001', cooperativeId: 'coop-001', transactionType: 'Contribution', amount: 5000, modeOfPayment: 'Mobile Money', transactionDate: '2026-02-01', notes: 'Monthly member dues' },
  { id: 'fnd-002', cooperativeId: 'coop-001', transactionType: 'Loan Disbursement', amount: 12000, modeOfPayment: 'Bank Transfer', transactionDate: '2026-03-02', notes: 'Input subsidy approved at executive meeting' },
]

const SEED_DOCUMENTS: GovernanceDocument[] = [
  { id: 'doc-001', cooperativeId: 'coop-001', documentType: 'Constitution', title: 'Kumasi Central Cooperative Constitution', uploadDate: '2021-03-10', status: 'Active' },
]

const SEED_TRACEABILITY: TraceabilityRecord[] = [
  { id: 'trc-001', cooperativeId: 'coop-001', farmerId: 'f-001', harvestDate: '2026-01-20', batchWeightKg: 320, fermentationConfirmed: true,  dryingConfirmed: true,  dryingMoisturePct: 7.2, lbcReceiptNumber: 'LBC-2026-0091', producerPrice: 1850, premiumPaid: 120, saleDate: '2026-01-28', season: '2025/2026' },
  { id: 'trc-002', cooperativeId: 'coop-001', farmerId: 'f-002', harvestDate: '2026-02-03', batchWeightKg: 275, fermentationConfirmed: true,  dryingConfirmed: false, dryingMoisturePct: null, lbcReceiptNumber: null,             producerPrice: null, premiumPaid: null, saleDate: null,       season: '2025/2026' },
  { id: 'trc-003', cooperativeId: 'coop-002', farmerId: 'f-003', harvestDate: '2026-01-15', batchWeightKg: 410, fermentationConfirmed: true,  dryingConfirmed: true,  dryingMoisturePct: 6.8, lbcReceiptNumber: 'LBC-2026-0074', producerPrice: 1850, premiumPaid: 150, saleDate: '2026-01-22', season: '2025/2026' },
]

// ─── Static option lists ───────────────────────────────────────────────────────

const OFFICER_ROLES: OfficerRole[] = ['Chairman', 'Secretary', 'Treasurer', 'Vice Chairman', 'Organizer']
const MEETING_TYPES: MeetingType[] = ['AGM', 'Executive', 'General', 'Emergency']
const VOTE_OUTCOMES: VoteOutcome[] = ['Passed', 'Rejected', 'Deferred']
const IMPLEMENTATION_STATUSES: ImplementationStatus[] = ['Pending', 'In Progress', 'Completed']
const CERTIFICATION_TYPES: CertificationType[] = ['Organic Certification', 'Fair Trade', 'Rainforest Alliance', 'COCOBOD License']
const COMPLIANCE_STATUSES: ComplianceStatus[] = ['Valid', 'Expiring Soon', 'Expired']
const FUND_TYPES: FundTransactionType[] = ['Contribution', 'Withdrawal', 'Loan Disbursement', 'Loan Repayment']
const PAYMENT_MODES: PaymentMode[] = ['Cash', 'Mobile Money', 'Bank Transfer']
const DOCUMENT_TYPES: DocumentType[] = ['Constitution', 'Registration Certificate', 'Meeting Minutes', 'Financial Statement', 'Other']

function coopStatusVariant(status: CooperativeStatus): 'success' | 'neutral' | 'warning' {
  if (status === 'Active') return 'success'
  if (status === 'Dormant') return 'warning'
  return 'neutral'
}

function voteVariant(v: VoteOutcome): 'success' | 'danger' | 'warning' {
  if (v === 'Passed') return 'success'
  if (v === 'Rejected') return 'danger'
  return 'warning'
}

function implVariant(v: ImplementationStatus): 'success' | 'info' | 'neutral' {
  if (v === 'Completed') return 'success'
  if (v === 'In Progress') return 'info'
  return 'neutral'
}

function complianceVariant(v: ComplianceStatus): 'success' | 'warning' | 'danger' {
  if (v === 'Valid') return 'success'
  if (v === 'Expiring Soon') return 'warning'
  return 'danger'
}

const GOV_TABS: { id: Exclude<GovTab, 'cooperatives'>; Icon: React.ElementType; label: string }[] = [
  { id: 'leadership',  Icon: Users2,       label: 'Leadership'  },
  { id: 'meetings',    Icon: CalendarDays, label: 'Meetings'    },
  { id: 'resolutions', Icon: Gavel,        label: 'Resolutions' },
  { id: 'compliance',  Icon: ShieldCheck,  label: 'Compliance'  },
  { id: 'funds',       Icon: Wallet,       label: 'Funds'       },
  { id: 'documents',   Icon: FileText,     label: 'Documents'   },
]

const PAGE_SIZE = 8

function SummaryCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number | string }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--brand-mint)' }}>
          <Icon className="w-3.5 h-3.5" style={{ color: 'var(--brand-forest)' }} />
        </div>
        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function DetailStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-1">
        <Icon className="w-3 h-3 text-gray-400" />
        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
      </div>
      <p className="text-sm font-medium text-gray-900 truncate">{value}</p>
    </div>
  )
}

function CooperativeGovernance() {
  const [cooperatives, setCooperatives] = usePersistedState<Cooperative[]>('gov-cooperatives', COOPERATIVES)
  const [officers, setOfficers]         = usePersistedState<Officer[]>('gov-officers', SEED_OFFICERS)
  const [meetings, setMeetings]         = usePersistedState<Meeting[]>('gov-meetings', SEED_MEETINGS)
  const [resolutions, setResolutions]   = usePersistedState<Resolution[]>('gov-resolutions', SEED_RESOLUTIONS)
  const [compliance, setCompliance]     = usePersistedState<ComplianceItem[]>('gov-compliance', SEED_COMPLIANCE)
  const [funds, setFunds]               = usePersistedState<FundTransaction[]>('gov-funds', SEED_FUNDS)
  const [documents, setDocuments]       = usePersistedState<GovernanceDocument[]>('gov-documents', SEED_DOCUMENTS)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [govTab, setGovTab] = useState<Exclude<GovTab, 'cooperatives'>>('leadership')

  const selectedCoop = cooperatives.find(c => c.id === selectedId) ?? null

  function coopName(id: string) {
    return cooperatives.find(c => c.id === id)?.name ?? '—'
  }

  const totalMembers = cooperatives.reduce((s, c) => s + c.memberCount, 0)
  const activeCerts = compliance.filter(c => c.status === 'Valid').length

  return (
    <div className="flex flex-col gap-4">
      {/* summary stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard icon={Landmark}    label="Cooperatives"  value={cooperatives.length} />
        <SummaryCard icon={Users2}      label="Total Members" value={totalMembers} />
        <SummaryCard icon={ShieldCheck} label="Active Certs"   value={activeCerts} />
        <SummaryCard icon={Gavel}       label="Resolutions"    value={resolutions.length} />
      </div>

      {/* body: cooperative list + detail */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <CooperativeSidebar
          cooperatives={cooperatives}
          setCooperatives={setCooperatives}
          selectedId={selectedId}
          onSelect={id => { setSelectedId(id); setGovTab('leadership') }}
        />

        <div className="lg:col-span-2 min-w-0">
          {!selectedCoop ? (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col items-center justify-center py-20 text-gray-400">
              <Gavel className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm">Select a cooperative from the list</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {/* banner header */}
              <div className="rounded-2xl p-5 text-white" style={{ background: 'var(--brand-forest)' }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/15 shrink-0">
                    <Landmark className="w-5 h-5 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base font-semibold truncate">Governance — {selectedCoop.name}</h2>
                    <p className="text-xs text-white/70 truncate">{selectedCoop.region} · {selectedCoop.communityName}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <DetailStat icon={Users2}   label="Members"     value={String(selectedCoop.memberCount)} />
                  <DetailStat icon={Landmark} label="Chairperson" value={selectedCoop.chairmanName || '—'} />
                  <DetailStat icon={FileText} label="Secretary"   value={selectedCoop.secretaryName || '—'} />
                  <DetailStat icon={Sprout}   label="Primary Crops" value={selectedCoop.primaryCrops.length ? selectedCoop.primaryCrops.join(', ') : '—'} />
                </div>
              </div>

              {/* horizontal pill sub-tabs */}
              <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto w-fit max-w-full">
                {GOV_TABS.map(({ id, Icon, label }) => {
                  const active = govTab === id
                  return (
                    <button
                      key={id}
                      onClick={() => setGovTab(id)}
                      className={cn(
                        'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0',
                        active ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700',
                      )}
                      style={active ? { color: 'var(--brand-forest)' } : {}}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* sub-tab content */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
                {govTab === 'leadership' && (
                  <LeadershipTab officers={officers} setOfficers={setOfficers} cooperatives={cooperatives} scopeId={selectedCoop.id} coopName={coopName} />
                )}
                {govTab === 'meetings' && (
                  <MeetingsTab meetings={meetings} setMeetings={setMeetings} cooperatives={cooperatives} scopeId={selectedCoop.id} coopName={coopName} />
                )}
                {govTab === 'resolutions' && (
                  <ResolutionsTab resolutions={resolutions} setResolutions={setResolutions} meetings={meetings} cooperatives={cooperatives} scopeId={selectedCoop.id} coopName={coopName} />
                )}
                {govTab === 'compliance' && (
                  <ComplianceTab compliance={compliance} setCompliance={setCompliance} cooperatives={cooperatives} scopeId={selectedCoop.id} coopName={coopName} />
                )}
                {govTab === 'funds' && (
                  <FundsTab funds={funds} setFunds={setFunds} cooperatives={cooperatives} scopeId={selectedCoop.id} coopName={coopName} />
                )}
                {govTab === 'documents' && (
                  <DocumentsTab documents={documents} setDocuments={setDocuments} cooperatives={cooperatives} scopeId={selectedCoop.id} coopName={coopName} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Cooperative sidebar (master list) ─────────────────────────────────────────

function CooperativeSidebar({
  cooperatives, setCooperatives, selectedId, onSelect,
}: {
  cooperatives: Cooperative[]
  setCooperatives: (v: Cooperative[] | ((prev: Cooperative[]) => Cooperative[])) => void
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [search, setSearch] = useState('')
  const [regionFilter, setRegionFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<Cooperative | null>(null)
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<Cooperative | null>(null)
  const [form, setForm] = useState<Partial<Cooperative>>({})
  const [nameError, setNameError] = useState<string | undefined>()

  const regionOptions = [
    { value: 'all', label: 'All Regions' },
    ...Array.from(new Set(cooperatives.map(c => c.region))).map(r => ({ value: r, label: r })),
  ]

  const filtered = useMemo(() => cooperatives.filter(c =>
    (regionFilter === 'all' || c.region === regionFilter) &&
    (c.name.toLowerCase().includes(search.toLowerCase()) ||
     c.communityName.toLowerCase().includes(search.toLowerCase()))
  ), [cooperatives, search, regionFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const hasActiveFilter = search.trim() !== '' || regionFilter !== 'all'

  function clearFilters() {
    setSearch('')
    setRegionFilter('all')
    setPage(1)
  }

  function openAdd() {
    setForm({ name: '', communityName: '', region: '', district: '', memberCount: 0, primaryCrops: [], chairmanName: '', secretaryName: '', status: 'Active', since: '' })
    setNameError(undefined)
    setAdding(true)
  }

  function saveNew() {
    if (!form.name?.trim()) { setNameError('Name is required'); return }
    const c: Cooperative = {
      id: `coop-${Date.now()}`,
      name: form.name ?? '',
      communityName: form.communityName ?? '',
      region: form.region ?? '',
      district: form.district ?? '',
      memberCount: Number(form.memberCount ?? 0),
      primaryCrops: typeof form.primaryCrops === 'string' ? (form.primaryCrops as unknown as string).split(',').map(s => s.trim()).filter(Boolean) : (form.primaryCrops ?? []),
      chairmanName: form.chairmanName ?? '',
      secretaryName: form.secretaryName ?? '',
      status: form.status ?? 'Active',
      since: form.since ?? '',
    }
    setCooperatives(prev => [...prev, c])
    setAdding(false)
  }

  function saveEdit() {
    if (!editing) return
    if (!form.name?.trim()) { setNameError('Name is required'); return }
    setCooperatives(prev => prev.map(c => c.id === editing.id ? {
      ...c,
      ...form,
      primaryCrops: typeof form.primaryCrops === 'string' ? (form.primaryCrops as unknown as string).split(',').map(s => s.trim()).filter(Boolean) : (form.primaryCrops ?? c.primaryCrops),
      memberCount: Number(form.memberCount ?? c.memberCount),
    } as Cooperative : c))
    setEditing(null)
  }

  function confirmDelete() {
    if (!deleting) return
    setCooperatives(prev => prev.filter(c => c.id !== deleting.id))
    if (selectedId === deleting.id) onSelect('')
    setDeleting(null)
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-gray-900">Cooperatives</h2>
        <ButtonTemplate variant="primary" size="sm" isIcon tooltip="Add Cooperative" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openAdd} />
      </div>

      <InputTemplate placeholder="Search cooperatives..." leftIcon={<Search className="w-3.5 h-3.5" />} value={search} onChange={e => { setSearch(e.target.value); setPage(1) }} size="sm" />
      <SelectTemplate size="sm" options={regionOptions} value={regionFilter} onChange={e => { setRegionFilter(e.target.value); setPage(1) }} />

      <div className="flex items-center justify-between">
        <p className="text-[11px] text-gray-400">{filtered.length} cooperative{filtered.length !== 1 ? 's' : ''}</p>
        {hasActiveFilter && (
          <button onClick={clearFilters} className="text-[11px] font-medium hover:underline" style={{ color: 'var(--brand-forest)' }}>
            Clear filters
          </button>
        )}
      </div>

      {paged.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Landmark className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">No cooperatives found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {paged.map(coop => {
            const active = selectedId === coop.id
            return (
              <div
                key={coop.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelect(coop.id)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(coop.id) } }}
                className={cn(
                  'text-left bg-white rounded-xl border p-3 transition-all cursor-pointer',
                  active ? 'shadow-md ring-1' : 'border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200',
                )}
                style={active ? { borderColor: 'var(--brand-mid)', boxShadow: '0 0 0 1px var(--brand-mid)' } as React.CSSProperties : undefined}
              >
                <div className="flex items-start gap-2.5">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--brand-mint)' }}>
                    <Landmark className="w-4 h-4" style={{ color: 'var(--brand-forest)' }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-900 truncate">{coop.name}</p>
                      <div className="flex items-center gap-1 shrink-0">
                        <ButtonTemplate variant="ghost" size="xs" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3 h-3" />}
                          onClick={e => { e.stopPropagation(); setEditing(coop); setForm(coop); setNameError(undefined) }} />
                        <ButtonTemplate variant="ghost" size="xs" isIcon tooltip="Delete" leftIcon={<Trash2 className="w-3 h-3" />}
                          onClick={e => { e.stopPropagation(); setDeleting(coop) }} />
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 mt-1">
                      <span className="flex items-center gap-1 text-[11px] text-gray-500">
                        <Users2 className="w-3 h-3" />{coop.memberCount}
                      </span>
                      {coop.primaryCrops.length > 0 && (
                        <span className="text-[11px] text-gray-400">{coop.primaryCrops.slice(0, 2).join(', ')}</span>
                      )}
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <MapPin className="w-3 h-3" />{coop.communityName}
                      </span>
                    </div>
                    <div className="mt-1.5">
                      <BadgeTemplate label={coop.status} variant={coopStatusVariant(coop.status)} size="sm" />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-1 text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: 'var(--brand-forest)' }}
          >
            <ChevronLeft className="w-3.5 h-3.5" /> Prev
          </button>
          <span className="text-[11px] text-gray-400">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-1 text-xs font-medium disabled:opacity-30 disabled:cursor-not-allowed"
            style={{ color: 'var(--brand-forest)' }}
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Add sheet */}
      <SheetTemplate
        open={adding}
        onClose={() => setAdding(false)}
        title="Add Cooperative"
        footer={
          <div className="col-span-2 flex justify-end gap-2">
            <ButtonTemplate variant="outline" label="Cancel" onClick={() => setAdding(false)} />
            <ButtonTemplate variant="primary" label="Save" onClick={saveNew} />
          </div>
        }
      >
        <CooperativeForm form={form} setForm={setForm} nameError={nameError} clearNameError={() => setNameError(undefined)} />
      </SheetTemplate>

      {/* Edit sheet */}
      <SheetTemplate
        open={!!editing}
        onClose={() => setEditing(null)}
        title="Edit Cooperative"
        footer={
          <div className="col-span-2 flex justify-end gap-2">
            <ButtonTemplate variant="outline" label="Cancel" onClick={() => setEditing(null)} />
            <ButtonTemplate variant="primary" label="Save" onClick={saveEdit} />
          </div>
        }
      >
        <CooperativeForm form={form} setForm={setForm} nameError={nameError} clearNameError={() => setNameError(undefined)} />
      </SheetTemplate>

      <ConfirmModal
        open={!!deleting}
        title="Delete Cooperative"
        message={`Are you sure you want to delete "${deleting?.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  )
}

// ─── Cooperative add/edit form ─────────────────────────────────────────────────

function CooperativeForm({
  form, setForm, nameError, clearNameError,
}: {
  form: Partial<Cooperative>
  setForm: (v: Partial<Cooperative>) => void
  nameError?: string
  clearNameError?: () => void
}) {
  return (
    <div className="px-6 py-5 flex flex-col gap-4">
      <InputTemplate label="Name" isRequired error={nameError} value={form.name ?? ''} onChange={e => { setForm({ ...form, name: e.target.value }); clearNameError?.() }} />
      <InputTemplate label="Community" value={form.communityName ?? ''} onChange={e => setForm({ ...form, communityName: e.target.value })} />
      <div className="grid grid-cols-2 gap-3">
        <InputTemplate label="Region" value={form.region ?? ''} onChange={e => setForm({ ...form, region: e.target.value })} />
        <InputTemplate label="District" value={form.district ?? ''} onChange={e => setForm({ ...form, district: e.target.value })} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <InputTemplate label="Members" type="number" value={form.memberCount ?? 0} onChange={e => setForm({ ...form, memberCount: Number(e.target.value) })} />
        <SelectTemplate
          label="Status"
          options={(['Active', 'Inactive', 'Dormant'] as CooperativeStatus[]).map(s => ({ value: s, label: s }))}
          value={form.status ?? 'Active'}
          onChange={e => setForm({ ...form, status: e.target.value as CooperativeStatus })}
        />
      </div>
      <InputTemplate label="Primary Crops (comma separated)" value={Array.isArray(form.primaryCrops) ? form.primaryCrops.join(', ') : (form.primaryCrops ?? '')} onChange={e => setForm({ ...form, primaryCrops: e.target.value as unknown as string[] })} />
      <div className="grid grid-cols-2 gap-3">
        <InputTemplate label="Chairman" value={form.chairmanName ?? ''} onChange={e => setForm({ ...form, chairmanName: e.target.value })} />
        <InputTemplate label="Secretary" value={form.secretaryName ?? ''} onChange={e => setForm({ ...form, secretaryName: e.target.value })} />
      </div>
      <InputTemplate label="Member Since (YYYY-MM)" placeholder="2024-01" value={form.since ?? ''} onChange={e => setForm({ ...form, since: e.target.value })} />
    </div>
  )
}

// ─── Leadership tab ────────────────────────────────────────────────────────────

function LeadershipTab({
  officers, setOfficers, cooperatives, scopeId, coopName,
}: {
  officers: Officer[]
  setOfficers: (v: Officer[] | ((prev: Officer[]) => Officer[])) => void
  cooperatives: Cooperative[]
  scopeId: string
  coopName: (id: string) => string
}) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Officer | null>(null)
  const [deleting, setDeleting] = useState<Officer | null>(null)
  const [form, setForm] = useState<Partial<Officer>>({})
  const [nameError, setNameError] = useState<string | undefined>()

  const filtered = officers.filter(o => o.cooperativeId === scopeId)

  const columns: DatagridColumn<Officer>[] = [
    { key: 'name', label: 'Name' },
    { key: 'cooperativeId', label: 'Cooperative', render: v => coopName(v as string) },
    { key: 'role', label: 'Role' },
    { key: 'phone', label: 'Phone' },
    { key: 'termStart', label: 'Term', render: (_v, row) => `${row.termStart} – ${row.termEnd}` },
    { key: 'isActive', label: 'Status', render: v => <BadgeTemplate label={v ? 'Active' : 'Inactive'} variant={v ? 'success' : 'neutral'} size="sm" /> },
    { key: 'id', label: '', id: 'actions', render: (_v, row) => (
      <div className="flex items-center gap-1 justify-end">
        <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />}
          onClick={() => { setEditing(row); setForm(row); setNameError(undefined) }} />
        <ButtonTemplate variant="danger" size="sm" isIcon tooltip="Delete" leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          onClick={() => setDeleting(row)} />
      </div>
    ) },
  ]

  function openAdd() {
    setForm({ cooperativeId: scopeId, role: 'Chairman', isActive: true })
    setNameError(undefined)
    setAdding(true)
  }

  function saveNew() {
    if (!form.name?.trim()) { setNameError('Name is required'); return }
    const o: Officer = {
      id: `off-${Date.now()}`,
      cooperativeId: form.cooperativeId ?? cooperatives[0]?.id ?? '',
      name: form.name ?? '',
      role: form.role ?? 'Chairman',
      phone: form.phone ?? '',
      termStart: form.termStart ?? '',
      termEnd: form.termEnd ?? '',
      isActive: form.isActive ?? true,
    }
    setOfficers(prev => [...prev, o])
    setAdding(false)
  }

  function saveEdit() {
    if (!editing) return
    if (!form.name?.trim()) { setNameError('Name is required'); return }
    setOfficers(prev => prev.map(o => o.id === editing.id ? { ...o, ...form } as Officer : o))
    setEditing(null)
  }

  function confirmDelete() {
    if (!deleting) return
    setOfficers(prev => prev.filter(o => o.id !== deleting.id))
    setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users2 className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
          <h2 className="text-base font-bold text-gray-900">Leadership</h2>
        </div>
        <ButtonTemplate variant="primary" size="sm" label="Add Officer" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openAdd} />
      </div>

      <DatagridTemplate columns={columns} data={filtered} rowKey="id" defaultPageSize={10} pageSizeOptions={[10, 25, 50, 0]} emptyLabel="No officers found" />

      <SheetTemplate
        open={adding || !!editing}
        onClose={() => { setAdding(false); setEditing(null) }}
        title={editing ? 'Edit Officer' : 'Add Officer'}
        footer={
          <div className="col-span-2 flex justify-end gap-2">
            <ButtonTemplate variant="outline" label="Cancel" onClick={() => { setAdding(false); setEditing(null) }} />
            <ButtonTemplate variant="primary" label="Save" onClick={editing ? saveEdit : saveNew} />
          </div>
        }
      >
        <div className="px-6 py-5 flex flex-col gap-4">
          <SelectTemplate label="Cooperative" options={cooperatives.map(c => ({ value: c.id, label: c.name }))} value={form.cooperativeId ?? ''} onChange={e => setForm({ ...form, cooperativeId: e.target.value })} />
          <InputTemplate label="Name" isRequired error={nameError} value={form.name ?? ''} onChange={e => { setForm({ ...form, name: e.target.value }); setNameError(undefined) }} />
          <SelectTemplate label="Role" options={OFFICER_ROLES.map(r => ({ value: r, label: r }))} value={form.role ?? 'Chairman'} onChange={e => setForm({ ...form, role: e.target.value as OfficerRole })} />
          <InputTemplate label="Phone" value={form.phone ?? ''} onChange={e => setForm({ ...form, phone: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <InputTemplate label="Term Start (YYYY-MM)" value={form.termStart ?? ''} onChange={e => setForm({ ...form, termStart: e.target.value })} />
            <InputTemplate label="Term End (YYYY-MM)" value={form.termEnd ?? ''} onChange={e => setForm({ ...form, termEnd: e.target.value })} />
          </div>
        </div>
      </SheetTemplate>

      <ConfirmModal open={!!deleting} title="Remove Officer" message={`Remove "${deleting?.name}" from leadership?`} confirmLabel="Remove" variant="danger" onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </div>
  )
}

// ─── Meetings tab ──────────────────────────────────────────────────────────────

function MeetingsTab({
  meetings, setMeetings, cooperatives, scopeId, coopName,
}: {
  meetings: Meeting[]
  setMeetings: (v: Meeting[] | ((prev: Meeting[]) => Meeting[])) => void
  cooperatives: Cooperative[]
  scopeId: string
  coopName: (id: string) => string
}) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Meeting | null>(null)
  const [deleting, setDeleting] = useState<Meeting | null>(null)
  const [form, setForm] = useState<Partial<Meeting>>({})

  const filtered = meetings.filter(m => m.cooperativeId === scopeId)

  const columns: DatagridColumn<Meeting>[] = [
    { key: 'meetingDate', label: 'Date' },
    { key: 'cooperativeId', label: 'Cooperative', render: v => coopName(v as string) },
    { key: 'meetingType', label: 'Type' },
    { key: 'attendanceCount', label: 'Attendance' },
    { key: 'agenda', label: 'Agenda' },
    { key: 'id', label: '', id: 'actions', render: (_v, row) => (
      <div className="flex items-center gap-1 justify-end">
        <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />}
          onClick={() => { setEditing(row); setForm(row) }} />
        <ButtonTemplate variant="danger" size="sm" isIcon tooltip="Delete" leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          onClick={() => setDeleting(row)} />
      </div>
    ) },
  ]

  function openAdd() {
    setForm({ cooperativeId: scopeId, meetingType: 'General', attendanceCount: 0 })
    setAdding(true)
  }

  function saveNew() {
    const m: Meeting = {
      id: `mtg-${Date.now()}`,
      cooperativeId: form.cooperativeId ?? cooperatives[0]?.id ?? '',
      meetingType: form.meetingType ?? 'General',
      meetingDate: form.meetingDate ?? '',
      attendanceCount: Number(form.attendanceCount ?? 0),
      agenda: form.agenda ?? '',
      minutes: form.minutes ?? '',
    }
    setMeetings(prev => [...prev, m])
    setAdding(false)
  }

  function saveEdit() {
    if (!editing) return
    setMeetings(prev => prev.map(m => m.id === editing.id ? { ...m, ...form, attendanceCount: Number(form.attendanceCount ?? editing.attendanceCount) } as Meeting : m))
    setEditing(null)
  }

  function confirmDelete() {
    if (!deleting) return
    setMeetings(prev => prev.filter(m => m.id !== deleting.id))
    setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
          <h2 className="text-base font-bold text-gray-900">Meetings</h2>
        </div>
        <ButtonTemplate variant="primary" size="sm" label="Add Meeting" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openAdd} />
      </div>

      <DatagridTemplate columns={columns} data={filtered} rowKey="id" defaultPageSize={10} pageSizeOptions={[10, 25, 50, 0]} emptyLabel="No meetings found" />

      <SheetTemplate
        open={adding || !!editing}
        onClose={() => { setAdding(false); setEditing(null) }}
        title={editing ? 'Edit Meeting' : 'Add Meeting'}
        footer={
          <div className="col-span-2 flex justify-end gap-2">
            <ButtonTemplate variant="outline" label="Cancel" onClick={() => { setAdding(false); setEditing(null) }} />
            <ButtonTemplate variant="primary" label="Save" onClick={editing ? saveEdit : saveNew} />
          </div>
        }
      >
        <div className="px-6 py-5 flex flex-col gap-4">
          <SelectTemplate label="Cooperative" options={cooperatives.map(c => ({ value: c.id, label: c.name }))} value={form.cooperativeId ?? ''} onChange={e => setForm({ ...form, cooperativeId: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <SelectTemplate label="Meeting Type" options={MEETING_TYPES.map(t => ({ value: t, label: t }))} value={form.meetingType ?? 'General'} onChange={e => setForm({ ...form, meetingType: e.target.value as MeetingType })} />
            <InputTemplate label="Date" type="date" value={form.meetingDate ?? ''} onChange={e => setForm({ ...form, meetingDate: e.target.value })} />
          </div>
          <InputTemplate label="Attendance Count" type="number" value={form.attendanceCount ?? 0} onChange={e => setForm({ ...form, attendanceCount: Number(e.target.value) })} />
          <InputTemplate label="Agenda" value={form.agenda ?? ''} onChange={e => setForm({ ...form, agenda: e.target.value })} />
          <InputTemplate label="Minutes" value={form.minutes ?? ''} onChange={e => setForm({ ...form, minutes: e.target.value })} />
        </div>
      </SheetTemplate>

      <ConfirmModal open={!!deleting} title="Delete Meeting" message={`Delete this ${deleting?.meetingType} meeting record?`} confirmLabel="Delete" variant="danger" onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </div>
  )
}

// ─── Resolutions tab ────────────────────────────────────────────────────────────

function ResolutionsTab({
  resolutions, setResolutions, meetings, cooperatives, scopeId, coopName,
}: {
  resolutions: Resolution[]
  setResolutions: (v: Resolution[] | ((prev: Resolution[]) => Resolution[])) => void
  meetings: Meeting[]
  cooperatives: Cooperative[]
  scopeId: string
  coopName: (id: string) => string
}) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<Resolution | null>(null)
  const [deleting, setDeleting] = useState<Resolution | null>(null)
  const [form, setForm] = useState<Partial<Resolution>>({})
  const [titleError, setTitleError] = useState<string | undefined>()

  const filtered = resolutions.filter(r => r.cooperativeId === scopeId)

  const columns: DatagridColumn<Resolution>[] = [
    { key: 'title', label: 'Title' },
    { key: 'cooperativeId', label: 'Cooperative', render: v => coopName(v as string) },
    { key: 'datePassed', label: 'Date' },
    { key: 'voteOutcome', label: 'Vote', render: v => <BadgeTemplate label={v as string} variant={voteVariant(v as VoteOutcome)} size="sm" /> },
    { key: 'implementationStatus', label: 'Implementation', render: v => <BadgeTemplate label={v as string} variant={implVariant(v as ImplementationStatus)} size="sm" /> },
    { key: 'id', label: '', id: 'actions', render: (_v, row) => (
      <div className="flex items-center gap-1 justify-end">
        <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />}
          onClick={() => { setEditing(row); setForm(row); setTitleError(undefined) }} />
        <ButtonTemplate variant="danger" size="sm" isIcon tooltip="Delete" leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          onClick={() => setDeleting(row)} />
      </div>
    ) },
  ]

  const cooperativeIdForForm = form.cooperativeId ?? scopeId
  const meetingOptions = meetings.filter(m => m.cooperativeId === cooperativeIdForForm).map(m => ({ value: m.id, label: `${m.meetingType} — ${m.meetingDate}` }))

  function openAdd() {
    setForm({ cooperativeId: scopeId, voteOutcome: 'Passed', implementationStatus: 'Pending' })
    setTitleError(undefined)
    setAdding(true)
  }

  function saveNew() {
    if (!form.title?.trim()) { setTitleError('Title is required'); return }
    const r: Resolution = {
      id: `res-${Date.now()}`,
      cooperativeId: form.cooperativeId ?? cooperatives[0]?.id ?? '',
      meetingId: form.meetingId ?? '',
      title: form.title ?? '',
      description: form.description ?? '',
      voteOutcome: form.voteOutcome ?? 'Passed',
      implementationStatus: form.implementationStatus ?? 'Pending',
      datePassed: form.datePassed ?? '',
    }
    setResolutions(prev => [...prev, r])
    setAdding(false)
  }

  function saveEdit() {
    if (!editing) return
    if (!form.title?.trim()) { setTitleError('Title is required'); return }
    setResolutions(prev => prev.map(r => r.id === editing.id ? { ...r, ...form } as Resolution : r))
    setEditing(null)
  }

  function confirmDelete() {
    if (!deleting) return
    setResolutions(prev => prev.filter(r => r.id !== deleting.id))
    setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Gavel className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
          <h2 className="text-base font-bold text-gray-900">Resolutions</h2>
        </div>
        <ButtonTemplate variant="primary" size="sm" label="Add Resolution" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openAdd} />
      </div>

      <DatagridTemplate columns={columns} data={filtered} rowKey="id" defaultPageSize={10} pageSizeOptions={[10, 25, 50, 0]} emptyLabel="No resolutions found" />

      <SheetTemplate
        open={adding || !!editing}
        onClose={() => { setAdding(false); setEditing(null) }}
        title={editing ? 'Edit Resolution' : 'Add Resolution'}
        footer={
          <div className="col-span-2 flex justify-end gap-2">
            <ButtonTemplate variant="outline" label="Cancel" onClick={() => { setAdding(false); setEditing(null) }} />
            <ButtonTemplate variant="primary" label="Save" onClick={editing ? saveEdit : saveNew} />
          </div>
        }
      >
        <div className="px-6 py-5 flex flex-col gap-4">
          <SelectTemplate label="Cooperative" options={cooperatives.map(c => ({ value: c.id, label: c.name }))} value={form.cooperativeId ?? ''} onChange={e => setForm({ ...form, cooperativeId: e.target.value, meetingId: undefined })} />
          <SelectTemplate label="Meeting" options={meetingOptions} placeholder="Select a meeting..." value={form.meetingId ?? ''} onChange={e => setForm({ ...form, meetingId: e.target.value })} />
          <InputTemplate label="Title" isRequired error={titleError} value={form.title ?? ''} onChange={e => { setForm({ ...form, title: e.target.value }); setTitleError(undefined) }} />
          <InputTemplate label="Description" value={form.description ?? ''} onChange={e => setForm({ ...form, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <SelectTemplate label="Vote Outcome" options={VOTE_OUTCOMES.map(v => ({ value: v, label: v }))} value={form.voteOutcome ?? 'Passed'} onChange={e => setForm({ ...form, voteOutcome: e.target.value as VoteOutcome })} />
            <SelectTemplate label="Implementation" options={IMPLEMENTATION_STATUSES.map(v => ({ value: v, label: v }))} value={form.implementationStatus ?? 'Pending'} onChange={e => setForm({ ...form, implementationStatus: e.target.value as ImplementationStatus })} />
          </div>
          <InputTemplate label="Date Passed" type="date" value={form.datePassed ?? ''} onChange={e => setForm({ ...form, datePassed: e.target.value })} />
        </div>
      </SheetTemplate>

      <ConfirmModal open={!!deleting} title="Delete Resolution" message={`Delete resolution "${deleting?.title}"?`} confirmLabel="Delete" variant="danger" onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </div>
  )
}

// ─── Compliance tab ─────────────────────────────────────────────────────────────

function ComplianceTab({
  compliance, setCompliance, cooperatives, scopeId, coopName,
}: {
  compliance: ComplianceItem[]
  setCompliance: (v: ComplianceItem[] | ((prev: ComplianceItem[]) => ComplianceItem[])) => void
  cooperatives: Cooperative[]
  scopeId: string
  coopName: (id: string) => string
}) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<ComplianceItem | null>(null)
  const [deleting, setDeleting] = useState<ComplianceItem | null>(null)
  const [form, setForm] = useState<Partial<ComplianceItem>>({})

  const filtered = compliance.filter(c => c.cooperativeId === scopeId)

  const columns: DatagridColumn<ComplianceItem>[] = [
    { key: 'certificationType', label: 'Certification' },
    { key: 'cooperativeId', label: 'Cooperative', render: v => coopName(v as string) },
    { key: 'issueDate', label: 'Issued' },
    { key: 'expiryDate', label: 'Expires' },
    { key: 'status', label: 'Status', render: v => <BadgeTemplate label={v as string} variant={complianceVariant(v as ComplianceStatus)} size="sm" /> },
    { key: 'id', label: '', id: 'actions', render: (_v, row) => (
      <div className="flex items-center gap-1 justify-end">
        <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />}
          onClick={() => { setEditing(row); setForm(row) }} />
        <ButtonTemplate variant="danger" size="sm" isIcon tooltip="Delete" leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          onClick={() => setDeleting(row)} />
      </div>
    ) },
  ]

  function openAdd() {
    setForm({ cooperativeId: scopeId, certificationType: 'Fair Trade', status: 'Valid' })
    setAdding(true)
  }

  function saveNew() {
    const c: ComplianceItem = {
      id: `cmp-${Date.now()}`,
      cooperativeId: form.cooperativeId ?? cooperatives[0]?.id ?? '',
      certificationType: form.certificationType ?? 'Fair Trade',
      issueDate: form.issueDate ?? '',
      expiryDate: form.expiryDate ?? '',
      status: form.status ?? 'Valid',
    }
    setCompliance(prev => [...prev, c])
    setAdding(false)
  }

  function saveEdit() {
    if (!editing) return
    setCompliance(prev => prev.map(c => c.id === editing.id ? { ...c, ...form } as ComplianceItem : c))
    setEditing(null)
  }

  function confirmDelete() {
    if (!deleting) return
    setCompliance(prev => prev.filter(c => c.id !== deleting.id))
    setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
          <h2 className="text-base font-bold text-gray-900">Compliance</h2>
        </div>
        <ButtonTemplate variant="primary" size="sm" label="Add Certification" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openAdd} />
      </div>

      <DatagridTemplate columns={columns} data={filtered} rowKey="id" defaultPageSize={10} pageSizeOptions={[10, 25, 50, 0]} emptyLabel="No compliance records found" />

      <SheetTemplate
        open={adding || !!editing}
        onClose={() => { setAdding(false); setEditing(null) }}
        title={editing ? 'Edit Certification' : 'Add Certification'}
        footer={
          <div className="col-span-2 flex justify-end gap-2">
            <ButtonTemplate variant="outline" label="Cancel" onClick={() => { setAdding(false); setEditing(null) }} />
            <ButtonTemplate variant="primary" label="Save" onClick={editing ? saveEdit : saveNew} />
          </div>
        }
      >
        <div className="px-6 py-5 flex flex-col gap-4">
          <SelectTemplate label="Cooperative" options={cooperatives.map(c => ({ value: c.id, label: c.name }))} value={form.cooperativeId ?? ''} onChange={e => setForm({ ...form, cooperativeId: e.target.value })} />
          <SelectTemplate label="Certification Type" options={CERTIFICATION_TYPES.map(t => ({ value: t, label: t }))} value={form.certificationType ?? 'Fair Trade'} onChange={e => setForm({ ...form, certificationType: e.target.value as CertificationType })} />
          <div className="grid grid-cols-2 gap-3">
            <InputTemplate label="Issue Date" type="date" value={form.issueDate ?? ''} onChange={e => setForm({ ...form, issueDate: e.target.value })} />
            <InputTemplate label="Expiry Date" type="date" value={form.expiryDate ?? ''} onChange={e => setForm({ ...form, expiryDate: e.target.value })} />
          </div>
          <SelectTemplate label="Status" options={COMPLIANCE_STATUSES.map(s => ({ value: s, label: s }))} value={form.status ?? 'Valid'} onChange={e => setForm({ ...form, status: e.target.value as ComplianceStatus })} />
        </div>
      </SheetTemplate>

      <ConfirmModal open={!!deleting} title="Delete Certification" message={`Delete "${deleting?.certificationType}" record?`} confirmLabel="Delete" variant="danger" onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </div>
  )
}

// ─── Funds tab ──────────────────────────────────────────────────────────────────

function FundsTab({
  funds, setFunds, cooperatives, scopeId, coopName,
}: {
  funds: FundTransaction[]
  setFunds: (v: FundTransaction[] | ((prev: FundTransaction[]) => FundTransaction[])) => void
  cooperatives: Cooperative[]
  scopeId: string
  coopName: (id: string) => string
}) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<FundTransaction | null>(null)
  const [deleting, setDeleting] = useState<FundTransaction | null>(null)
  const [form, setForm] = useState<Partial<FundTransaction>>({})

  const filtered = funds.filter(f => f.cooperativeId === scopeId)
  const total = filtered.reduce((sum, f) => sum + (f.transactionType === 'Withdrawal' || f.transactionType === 'Loan Disbursement' ? -f.amount : f.amount), 0)

  const columns: DatagridColumn<FundTransaction>[] = [
    { key: 'transactionDate', label: 'Date' },
    { key: 'cooperativeId', label: 'Cooperative', render: v => coopName(v as string) },
    { key: 'transactionType', label: 'Type' },
    { key: 'amount', label: 'Amount', render: v => `GHS ${(v as number).toLocaleString()}` },
    { key: 'modeOfPayment', label: 'Payment Mode' },
    { key: 'notes', label: 'Notes' },
    { key: 'id', label: '', id: 'actions', render: (_v, row) => (
      <div className="flex items-center gap-1 justify-end">
        <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />}
          onClick={() => { setEditing(row); setForm(row) }} />
        <ButtonTemplate variant="danger" size="sm" isIcon tooltip="Delete" leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          onClick={() => setDeleting(row)} />
      </div>
    ) },
  ]

  function openAdd() {
    setForm({ cooperativeId: scopeId, transactionType: 'Contribution', modeOfPayment: 'Mobile Money', amount: 0 })
    setAdding(true)
  }

  function saveNew() {
    const f: FundTransaction = {
      id: `fnd-${Date.now()}`,
      cooperativeId: form.cooperativeId ?? cooperatives[0]?.id ?? '',
      transactionType: form.transactionType ?? 'Contribution',
      amount: Number(form.amount ?? 0),
      modeOfPayment: form.modeOfPayment ?? 'Mobile Money',
      transactionDate: form.transactionDate ?? '',
      notes: form.notes ?? '',
    }
    setFunds(prev => [...prev, f])
    setAdding(false)
  }

  function saveEdit() {
    if (!editing) return
    setFunds(prev => prev.map(f => f.id === editing.id ? { ...f, ...form, amount: Number(form.amount ?? editing.amount) } as FundTransaction : f))
    setEditing(null)
  }

  function confirmDelete() {
    if (!deleting) return
    setFunds(prev => prev.filter(f => f.id !== deleting.id))
    setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Wallet className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
          <h2 className="text-base font-bold text-gray-900">Funds</h2>
        </div>
        <ButtonTemplate variant="primary" size="sm" label="Add Transaction" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openAdd} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1">Net Balance</p>
        <p className="text-xl font-bold" style={{ color: 'var(--brand-forest)' }}>GHS {total.toLocaleString()}</p>
      </div>

      <DatagridTemplate columns={columns} data={filtered} rowKey="id" defaultPageSize={10} pageSizeOptions={[10, 25, 50, 0]} emptyLabel="No fund transactions found" />

      <SheetTemplate
        open={adding || !!editing}
        onClose={() => { setAdding(false); setEditing(null) }}
        title={editing ? 'Edit Transaction' : 'Add Transaction'}
        footer={
          <div className="col-span-2 flex justify-end gap-2">
            <ButtonTemplate variant="outline" label="Cancel" onClick={() => { setAdding(false); setEditing(null) }} />
            <ButtonTemplate variant="primary" label="Save" onClick={editing ? saveEdit : saveNew} />
          </div>
        }
      >
        <div className="px-6 py-5 flex flex-col gap-4">
          <SelectTemplate label="Cooperative" options={cooperatives.map(c => ({ value: c.id, label: c.name }))} value={form.cooperativeId ?? ''} onChange={e => setForm({ ...form, cooperativeId: e.target.value })} />
          <div className="grid grid-cols-2 gap-3">
            <SelectTemplate label="Transaction Type" options={FUND_TYPES.map(t => ({ value: t, label: t }))} value={form.transactionType ?? 'Contribution'} onChange={e => setForm({ ...form, transactionType: e.target.value as FundTransactionType })} />
            <InputTemplate label="Amount (GHS)" type="number" value={form.amount ?? 0} onChange={e => setForm({ ...form, amount: Number(e.target.value) })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <SelectTemplate label="Payment Mode" options={PAYMENT_MODES.map(m => ({ value: m, label: m }))} value={form.modeOfPayment ?? 'Mobile Money'} onChange={e => setForm({ ...form, modeOfPayment: e.target.value as PaymentMode })} />
            <InputTemplate label="Date" type="date" value={form.transactionDate ?? ''} onChange={e => setForm({ ...form, transactionDate: e.target.value })} />
          </div>
          <InputTemplate label="Notes" value={form.notes ?? ''} onChange={e => setForm({ ...form, notes: e.target.value })} />
        </div>
      </SheetTemplate>

      <ConfirmModal open={!!deleting} title="Delete Transaction" message="Delete this fund transaction record?" confirmLabel="Delete" variant="danger" onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </div>
  )
}

// ─── Documents tab ──────────────────────────────────────────────────────────────

function DocumentsTab({
  documents, setDocuments, cooperatives, scopeId, coopName,
}: {
  documents: GovernanceDocument[]
  setDocuments: (v: GovernanceDocument[] | ((prev: GovernanceDocument[]) => GovernanceDocument[])) => void
  cooperatives: Cooperative[]
  scopeId: string
  coopName: (id: string) => string
}) {
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<GovernanceDocument | null>(null)
  const [deleting, setDeleting] = useState<GovernanceDocument | null>(null)
  const [form, setForm] = useState<Partial<GovernanceDocument>>({})
  const [titleError, setTitleError] = useState<string | undefined>()

  const filtered = documents.filter(d => d.cooperativeId === scopeId)

  const columns: DatagridColumn<GovernanceDocument>[] = [
    { key: 'title', label: 'Title' },
    { key: 'cooperativeId', label: 'Cooperative', render: v => coopName(v as string) },
    { key: 'documentType', label: 'Type' },
    { key: 'uploadDate', label: 'Uploaded' },
    { key: 'status', label: 'Status', render: v => <BadgeTemplate label={v as string} variant={v === 'Active' ? 'success' : 'neutral'} size="sm" /> },
    { key: 'id', label: '', id: 'actions', render: (_v, row) => (
      <div className="flex items-center gap-1 justify-end">
        <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />}
          onClick={() => { setEditing(row); setForm(row); setTitleError(undefined) }} />
        <ButtonTemplate variant="danger" size="sm" isIcon tooltip="Delete" leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          onClick={() => setDeleting(row)} />
      </div>
    ) },
  ]

  function openAdd() {
    setForm({ cooperativeId: scopeId, documentType: 'Constitution', status: 'Active' })
    setTitleError(undefined)
    setAdding(true)
  }

  function saveNew() {
    if (!form.title?.trim()) { setTitleError('Title is required'); return }
    const d: GovernanceDocument = {
      id: `doc-${Date.now()}`,
      cooperativeId: form.cooperativeId ?? cooperatives[0]?.id ?? '',
      documentType: form.documentType ?? 'Constitution',
      title: form.title ?? '',
      uploadDate: form.uploadDate ?? '',
      status: form.status ?? 'Active',
    }
    setDocuments(prev => [...prev, d])
    setAdding(false)
  }

  function saveEdit() {
    if (!editing) return
    if (!form.title?.trim()) { setTitleError('Title is required'); return }
    setDocuments(prev => prev.map(d => d.id === editing.id ? { ...d, ...form } as GovernanceDocument : d))
    setEditing(null)
  }

  function confirmDelete() {
    if (!deleting) return
    setDocuments(prev => prev.filter(d => d.id !== deleting.id))
    setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
          <h2 className="text-base font-bold text-gray-900">Documents</h2>
        </div>
        <ButtonTemplate variant="primary" size="sm" label="Add Document" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openAdd} />
      </div>

      <DatagridTemplate columns={columns} data={filtered} rowKey="id" defaultPageSize={10} pageSizeOptions={[10, 25, 50, 0]} emptyLabel="No documents found" />

      <SheetTemplate
        open={adding || !!editing}
        onClose={() => { setAdding(false); setEditing(null) }}
        title={editing ? 'Edit Document' : 'Add Document'}
        footer={
          <div className="col-span-2 flex justify-end gap-2">
            <ButtonTemplate variant="outline" label="Cancel" onClick={() => { setAdding(false); setEditing(null) }} />
            <ButtonTemplate variant="primary" label="Save" onClick={editing ? saveEdit : saveNew} />
          </div>
        }
      >
        <div className="px-6 py-5 flex flex-col gap-4">
          <SelectTemplate label="Cooperative" options={cooperatives.map(c => ({ value: c.id, label: c.name }))} value={form.cooperativeId ?? ''} onChange={e => setForm({ ...form, cooperativeId: e.target.value })} />
          <InputTemplate label="Title" isRequired error={titleError} value={form.title ?? ''} onChange={e => { setForm({ ...form, title: e.target.value }); setTitleError(undefined) }} />
          <SelectTemplate label="Document Type" options={DOCUMENT_TYPES.map(t => ({ value: t, label: t }))} value={form.documentType ?? 'Constitution'} onChange={e => setForm({ ...form, documentType: e.target.value as DocumentType })} />
          <InputTemplate label="Upload Date" type="date" value={form.uploadDate ?? ''} onChange={e => setForm({ ...form, uploadDate: e.target.value })} />
          <SelectTemplate label="Status" options={(['Active', 'Archived'] as const).map(s => ({ value: s, label: s }))} value={form.status ?? 'Active'} onChange={e => setForm({ ...form, status: e.target.value as 'Active' | 'Archived' })} />
        </div>
      </SheetTemplate>

      <ConfirmModal open={!!deleting} title="Delete Document" message={`Delete "${deleting?.title}"?`} confirmLabel="Delete" variant="danger" onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </div>
  )
}

// ─── Traceability tab ───────────────────────────────────────────────────────────

function TraceStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--brand-mint)' }}>
          <Icon className="w-3.5 h-3.5" style={{ color: 'var(--brand-forest)' }} />
        </div>
        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function TraceabilityTab() {
  const [records, setRecords] = usePersistedState<TraceabilityRecord[]>('gov-traceability', SEED_TRACEABILITY)
  const [search, setSearch] = useState('')
  const [seasonFilter, setSeasonFilter] = useState('all')
  const [coopFilter, setCoopFilter] = useState('all')
  const [adding, setAdding] = useState(false)
  const [deleting, setDeleting] = useState<TraceabilityRecord | null>(null)
  const [form, setForm] = useState<Partial<TraceabilityRecord>>({})

  function coopName(id: string) {
    return COOPERATIVES.find(c => c.id === id)?.name ?? '—'
  }
  function farmerName(id: string) {
    return FARMERS_LIST.find(f => f.id === id)?.fullName ?? '—'
  }

  const seasonOptions = [
    { value: 'all', label: 'All Seasons' },
    ...Array.from(new Set(records.map(r => r.season))).map(s => ({ value: s, label: s })),
  ]
  const coopOptions = [
    { value: 'all', label: 'All Cooperatives' },
    ...COOPERATIVES.map(c => ({ value: c.id, label: c.name })),
  ]

  const filtered = records.filter(r =>
    (seasonFilter === 'all' || r.season === seasonFilter) &&
    (coopFilter === 'all' || r.cooperativeId === coopFilter) &&
    (farmerName(r.farmerId).toLowerCase().includes(search.toLowerCase()) ||
     coopName(r.cooperativeId).toLowerCase().includes(search.toLowerCase()) ||
     (r.lbcReceiptNumber ?? '').toLowerCase().includes(search.toLowerCase()))
  )

  const totalWeight = filtered.reduce((s, r) => s + r.batchWeightKg, 0)
  const totalPremium = filtered.reduce((s, r) => s + (r.premiumPaid ?? 0), 0)
  const linkedFarmers = new Set(filtered.map(r => r.farmerId)).size
  const linkedCoops = new Set(filtered.map(r => r.cooperativeId)).size
  const fermented = filtered.filter(r => r.fermentationConfirmed).length
  const dried = filtered.filter(r => r.dryingConfirmed).length
  const receipts = filtered.filter(r => r.lbcReceiptNumber).length

  const farmerOptionsForForm = Object.entries(FARMER_COOPERATIVE_MAP)
    .filter(([, coopId]) => coopId === form.cooperativeId)
    .map(([farmerId]) => ({ value: farmerId, label: farmerName(farmerId) }))

  const columns: DatagridColumn<TraceabilityRecord>[] = [
    { key: 'harvestDate', label: 'Harvest Date' },
    { key: 'farmerId', label: 'Farmer', render: v => farmerName(v as string) },
    { key: 'cooperativeId', label: 'Cooperative', render: v => coopName(v as string) },
    { key: 'batchWeightKg', label: 'Weight (kg)', render: v => (v as number).toLocaleString() },
    { key: 'fermentationConfirmed', label: 'Ferm.', render: v => v
      ? <CheckCircle2 className="w-4 h-4 text-emerald-600" />
      : <XCircle className="w-4 h-4 text-gray-300" /> },
    { key: 'dryingConfirmed', label: 'Dried', render: (v, row) => (
      <div className="flex items-center gap-1.5">
        {v ? <CheckCircle2 className="w-4 h-4 text-emerald-600" /> : <XCircle className="w-4 h-4 text-gray-300" />}
        {row.dryingMoisturePct != null && <span className="text-xs text-gray-400">{row.dryingMoisturePct}%</span>}
      </div>
    ) },
    { key: 'lbcReceiptNumber', label: 'LBC Receipt', render: v => v ?? '—' },
    { key: 'premiumPaid', label: 'Premium', render: v => v != null ? `GHS ${(v as number).toLocaleString()}` : '—' },
    { key: 'season', label: 'Season' },
    { key: 'id', label: '', id: 'actions', render: (_v, row) => (
      <div className="flex items-center justify-end">
        <ButtonTemplate variant="danger" size="sm" isIcon tooltip="Delete" leftIcon={<Trash2 className="w-3.5 h-3.5" />}
          onClick={() => setDeleting(row)} />
      </div>
    ) },
  ]

  function openAdd() {
    setForm({ cooperativeId: COOPERATIVES[0]?.id, harvestDate: '', batchWeightKg: 0, fermentationConfirmed: false, dryingConfirmed: false, season: '' })
    setAdding(true)
  }

  function saveNew() {
    if (!form.harvestDate || !form.batchWeightKg || !form.farmerId) return
    const r: TraceabilityRecord = {
      id: `trc-${Date.now()}`,
      cooperativeId: form.cooperativeId ?? COOPERATIVES[0]?.id ?? '',
      farmerId: form.farmerId ?? '',
      harvestDate: form.harvestDate ?? '',
      batchWeightKg: Number(form.batchWeightKg ?? 0),
      fermentationConfirmed: form.fermentationConfirmed ?? false,
      dryingConfirmed: form.dryingConfirmed ?? false,
      dryingMoisturePct: form.dryingMoisturePct != null ? Number(form.dryingMoisturePct) : null,
      lbcReceiptNumber: form.lbcReceiptNumber ?? null,
      producerPrice: form.producerPrice != null ? Number(form.producerPrice) : null,
      premiumPaid: form.premiumPaid != null ? Number(form.premiumPaid) : null,
      saleDate: form.saleDate ?? null,
      season: form.season ?? '',
    }
    setRecords(prev => [...prev, r])
    setAdding(false)
  }

  function confirmDelete() {
    if (!deleting) return
    setRecords(prev => prev.filter(r => r.id !== deleting.id))
    setDeleting(null)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Truck className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
          <div>
            <h2 className="text-base font-bold text-gray-900">Crop Traceability</h2>
            <p className="text-xs text-gray-500">Track produce batches from farm to sale — supports traceability and sustainability compliance</p>
          </div>
        </div>
        <ButtonTemplate variant="primary" size="sm" label="Add Batch" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openAdd} />
      </div>

      {/* stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <TraceStat icon={Truck}      label="Batches"            value={filtered.length} />
        <TraceStat icon={Download}   label="Total Weight (kg)"  value={totalWeight.toLocaleString()} />
        <TraceStat icon={TrendingUp} label="Total Premium (GHS)" value={totalPremium.toLocaleString()} />
        <TraceStat icon={Users2}     label="Linked Farmers"     value={linkedFarmers} />
        <TraceStat icon={Landmark}   label="Linked Cooperatives" value={linkedCoops} />
        <TraceStat icon={CheckCircle2} label="Fermented"        value={`${fermented}/${filtered.length}`} />
        <TraceStat icon={CheckCircle2} label="Dried"            value={`${dried}/${filtered.length}`} />
        <TraceStat icon={FileText}  label="Receipts"            value={receipts} />
      </div>

      {/* cross-module info callout */}
      <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 flex gap-3">
        <AlertCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
        <div className="text-xs text-blue-800 space-y-1">
          <p className="font-semibold">How Traceability links to other modules</p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-700">
            <li>Farmers &amp; Farms → Farmers Registry module (farmer details, farm sizes)</li>
            <li>Cooperatives → Governance module (member rosters, compliance records)</li>
            <li>Offtake Agreements → Credits module (receipt numbers, producer prices)</li>
            <li>Sustainability Attestations → fermentation/drying confirmation feeds into attestation workflow</li>
          </ul>
        </div>
      </div>

      {/* filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="flex-1 min-w-0">
          <InputTemplate placeholder="Search by receipt, farmer, or cooperative..." leftIcon={<Search className="w-3.5 h-3.5" />} value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="w-full sm:w-44"><SelectTemplate options={seasonOptions} value={seasonFilter} onChange={e => setSeasonFilter(e.target.value)} /></div>
        <div className="w-full sm:w-52"><SelectTemplate options={coopOptions} value={coopFilter} onChange={e => setCoopFilter(e.target.value)} /></div>
      </div>

      <DatagridTemplate columns={columns} data={filtered} rowKey="id" defaultPageSize={10} pageSizeOptions={[10, 25, 50, 0]} emptyLabel="No batches recorded yet." />

      <SheetTemplate
        open={adding}
        onClose={() => setAdding(false)}
        title="Add Cocoa Batch"
        footer={
          <div className="col-span-2 flex justify-end gap-2">
            <ButtonTemplate variant="outline" label="Cancel" onClick={() => setAdding(false)} />
            <ButtonTemplate variant="primary" label="Add Batch" isDisabled={!form.harvestDate || !form.batchWeightKg || !form.farmerId} onClick={saveNew} />
          </div>
        }
      >
        <div className="px-6 py-5 flex flex-col gap-4">
          <SelectTemplate label="Cooperative" options={coopOptions.filter(o => o.value !== 'all')} value={form.cooperativeId ?? ''} onChange={e => setForm({ ...form, cooperativeId: e.target.value, farmerId: undefined })} />
          <SelectTemplate label="Farmer" options={farmerOptionsForForm} placeholder={farmerOptionsForForm.length ? 'Select a farmer...' : 'No farmers in this cooperative'} value={form.farmerId ?? ''} onChange={e => setForm({ ...form, farmerId: e.target.value })} isDisabled={!form.cooperativeId} />
          <div className="grid grid-cols-2 gap-3">
            <InputTemplate label="Harvest Date" isRequired type="date" value={form.harvestDate ?? ''} onChange={e => setForm({ ...form, harvestDate: e.target.value })} />
            <InputTemplate label="Batch Weight (kg)" isRequired type="number" value={form.batchWeightKg ?? 0} onChange={e => setForm({ ...form, batchWeightKg: Number(e.target.value) })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputTemplate label="Drying Moisture (%)" type="number" step="0.1" value={form.dryingMoisturePct ?? ''} onChange={e => setForm({ ...form, dryingMoisturePct: e.target.value === '' ? null : Number(e.target.value) })} />
            <InputTemplate label="LBC Receipt #" value={form.lbcReceiptNumber ?? ''} onChange={e => setForm({ ...form, lbcReceiptNumber: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputTemplate label="Producer Price (GHS/ton)" type="number" value={form.producerPrice ?? ''} onChange={e => setForm({ ...form, producerPrice: e.target.value === '' ? null : Number(e.target.value) })} />
            <InputTemplate label="Premium (GHS)" type="number" value={form.premiumPaid ?? ''} onChange={e => setForm({ ...form, premiumPaid: e.target.value === '' ? null : Number(e.target.value) })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <InputTemplate label="Sale Date" type="date" value={form.saleDate ?? ''} onChange={e => setForm({ ...form, saleDate: e.target.value })} />
            <InputTemplate label="Season" placeholder="e.g. 2025/2026" value={form.season ?? ''} onChange={e => setForm({ ...form, season: e.target.value })} />
          </div>
          <div className="flex flex-col gap-2">
            <CheckboxTemplate label="Fermentation confirmed" checked={form.fermentationConfirmed ?? false} onChange={() => setForm({ ...form, fermentationConfirmed: !form.fermentationConfirmed })} />
            <CheckboxTemplate label="Drying confirmed" checked={form.dryingConfirmed ?? false} onChange={() => setForm({ ...form, dryingConfirmed: !form.dryingConfirmed })} />
          </div>
        </div>
      </SheetTemplate>

      <ConfirmModal open={!!deleting} title="Delete Batch" message="Delete this traceability batch record?" confirmLabel="Delete" variant="danger" onConfirm={confirmDelete} onCancel={() => setDeleting(null)} />
    </div>
  )
}

// ─── Insights tab ───────────────────────────────────────────────────────────────

function InsightsStat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--brand-mint)' }}>
          <Icon className="w-3.5 h-3.5" style={{ color: 'var(--brand-forest)' }} />
        </div>
        <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold">{label}</p>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function InsightsTab() {
  const [cooperatives] = usePersistedState<Cooperative[]>('gov-cooperatives', COOPERATIVES)
  const [officers] = usePersistedState<Officer[]>('gov-officers', SEED_OFFICERS)
  const [meetings] = usePersistedState<Meeting[]>('gov-meetings', SEED_MEETINGS)
  const [resolutions] = usePersistedState<Resolution[]>('gov-resolutions', SEED_RESOLUTIONS)
  const [compliance] = usePersistedState<ComplianceItem[]>('gov-compliance', SEED_COMPLIANCE)
  const [documents] = usePersistedState<GovernanceDocument[]>('gov-documents', SEED_DOCUMENTS)
  const [traceability] = usePersistedState<TraceabilityRecord[]>('gov-traceability', SEED_TRACEABILITY)

  const [scope, setScope] = useState<string>('all')
  const [insight, setInsight] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)

  const scopeOptions = [
    { value: 'all', label: 'All Cooperatives' },
    ...cooperatives.map(c => ({ value: c.id, label: c.name })),
  ]

  const inScope = <T extends { cooperativeId: string }>(items: T[]) =>
    scope === 'all' ? items : items.filter(i => i.cooperativeId === scope)

  const scopedCoops = scope === 'all' ? cooperatives : cooperatives.filter(c => c.id === scope)
  const totalMembers = scopedCoops.reduce((s, c) => s + c.memberCount, 0)
  const linkedFarmers = new Set(Object.entries(FARMER_COOPERATIVE_MAP).filter(([, coopId]) => scope === 'all' || coopId === scope).map(([farmerId]) => farmerId)).size
  const scopedOfficers = inScope(officers).filter(o => o.isActive)
  const scopedMeetings = inScope(meetings)
  const scopedResolutions = inScope(resolutions)
  const scopedCompliance = inScope(compliance)
  const scopedDocuments = inScope(documents)
  const scopedBatches = inScope(traceability)
  const totalBatchWeight = scopedBatches.reduce((s, b) => s + b.batchWeightKg, 0)

  function handleGenerate() {
    setGenerating(true)
    setTimeout(() => {
      const activeCerts = scopedCompliance.filter(c => c.status === 'Valid').length
      const expiring = scopedCompliance.filter(c => c.status === 'Expiring Soon' || c.status === 'Expired').length
      const pendingResolutions = scopedResolutions.filter(r => r.implementationStatus !== 'Completed').length
      const scopeLabel = scope === 'all' ? 'across all cooperatives' : `for ${cooperatives.find(c => c.id === scope)?.name ?? 'this cooperative'}`

      const sentences = [
        `${scopedCoops.length} cooperative${scopedCoops.length !== 1 ? 's' : ''} ${scopeLabel} represent ${totalMembers} members, with ${linkedFarmers} farmers and ${scopedOfficers.length} active officer${scopedOfficers.length !== 1 ? 's' : ''} on record.`,
        `${scopedMeetings.length} meeting${scopedMeetings.length !== 1 ? 's' : ''} recorded and ${scopedResolutions.length} resolution${scopedResolutions.length !== 1 ? 's' : ''} passed, of which ${pendingResolutions} ${pendingResolutions !== 1 ? 'are' : 'is'} still pending implementation.`,
        activeCerts > 0 || expiring > 0
          ? `Compliance stands at ${activeCerts} active certification${activeCerts !== 1 ? 's' : ''}${expiring > 0 ? `, with ${expiring} expiring soon or expired and needing renewal` : ''}.`
          : 'No compliance certifications are currently on record.',
        scopedBatches.length > 0
          ? `Crop traceability shows ${scopedBatches.length} logged batch${scopedBatches.length !== 1 ? 'es' : ''} totalling ${totalBatchWeight.toLocaleString()} kg.`
          : 'No crop traceability batches have been logged yet.',
        pendingResolutions > 0 || expiring > 0
          ? 'Norvi recommends prioritizing pending resolutions and any expiring certifications to keep cooperative governance in good standing.'
          : 'Governance records for this scope are current — no urgent follow-up items identified.',
      ]
      setInsight(sentences.join(' '))
      setGenerating(false)
    }, 500)
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
        <h2 className="text-base font-bold text-gray-900">Governance Insights</h2>
      </div>

      <div className="max-w-xs">
        <SelectTemplate labelVariant="compact" label="Scope" options={scopeOptions} value={scope} onChange={e => { setScope(e.target.value); setInsight(null) }} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <InsightsStat icon={Landmark} label="Cooperatives" value={scopedCoops.length} />
        <InsightsStat icon={Users2} label="Total Members" value={totalMembers} />
        <InsightsStat icon={Users2} label="Linked Farmers" value={linkedFarmers} />
        <InsightsStat icon={Users2} label="Active Officers" value={scopedOfficers.length} />
        <InsightsStat icon={CalendarDays} label="Meetings" value={scopedMeetings.length} />
        <InsightsStat icon={Gavel} label="Resolutions" value={scopedResolutions.length} />
        <InsightsStat icon={ShieldCheck} label="Certifications" value={scopedCompliance.length} />
        <InsightsStat icon={Truck} label="Traceability Batches" value={scopedBatches.length} />
        <InsightsStat icon={FileText} label="Documents" value={scopedDocuments.length} />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 flex items-center gap-3" style={{ background: 'var(--brand-forest)' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 bg-white/10">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white">Norvi AI</p>
            <p className="text-xs text-white/60">Governance insight generated from live cooperative data</p>
          </div>
          {insight && (
            <button
              onClick={handleGenerate}
              className="w-7 h-7 rounded-full flex items-center justify-center bg-white/10 hover:bg-white/20 transition-colors shrink-0"
              aria-label="Regenerate insight"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-white ${generating ? 'animate-spin' : ''}`} />
            </button>
          )}
        </div>
        <div className="p-5">
          {generating ? (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Sparkles className="w-6 h-6 animate-pulse" style={{ color: 'var(--brand-forest)' }} />
              <p className="text-sm text-gray-400">Norvi is analyzing governance data…</p>
            </div>
          ) : insight ? (
            <p className="text-sm text-gray-700 leading-relaxed">{insight}</p>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <p className="text-sm text-gray-400">No insight generated yet.</p>
              <button
                onClick={handleGenerate}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--brand-forest)' }}
              >
                <Sparkles className="w-4 h-4" />
                Generate Insight
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Top-level page shell (Profiles / Governance / Traceability / Insights) ────

type PageTab = 'profiles' | 'governance' | 'traceability' | 'insights'

const PAGE_TABS: { id: PageTab; Icon: React.ElementType; label: string }[] = [
  { id: 'profiles',     Icon: Globe2,      label: 'Profiles'     },
  { id: 'governance',   Icon: Landmark,    label: 'Governance'   },
  { id: 'traceability', Icon: Truck,       label: 'Traceability' },
  { id: 'insights',     Icon: Sparkles,    label: 'Insights'     },
]

export function Main() {
  const [pageTab, setPageTab] = usePersistedState<PageTab>('gov-page-tab', 'profiles')

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 p-6 pb-0">
        {/* page header */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <Landmark className="w-5 h-5 shrink-0" style={{ color: 'var(--brand-forest)' }} />
              <h1 className="text-xl font-bold text-gray-900 truncate">Governance</h1>
            </div>
            <p className="text-sm text-gray-500 ml-7 truncate">Community profiles, cooperative governance, crop traceability &amp; AI insights</p>
          </div>
        </div>

        {/* top-level pill tabs */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto w-fit max-w-full">
          {PAGE_TABS.map(({ id, Icon, label }) => {
            const active = pageTab === id
            return (
              <button
                key={id}
                onClick={() => setPageTab(id)}
                className={cn(
                  'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0',
                  active ? 'bg-white shadow-sm' : 'text-gray-500 hover:text-gray-700',
                )}
                style={active ? { color: 'var(--brand-forest)' } : {}}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            )
          })}
        </div>
      </div>

      {pageTab === 'profiles' && <div className="-mt-4"><CommunityProfileMain /></div>}
      {pageTab === 'governance' && <div className="p-6 pt-0"><CooperativeGovernance /></div>}
      {pageTab === 'traceability' && (
        <div className="p-6 pt-0">
          <TraceabilityTab />
        </div>
      )}
      {pageTab === 'insights' && (
        <div className="p-6 pt-0">
          <InsightsTab />
        </div>
      )}
    </div>
  )
}
