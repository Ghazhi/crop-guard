'use client'

import { useState, useEffect } from 'react'
import { usePersistedState } from '@/lib/usePersistedState'
import { cn } from '@/lib/utils'
import {
  MapPin, Users, ChevronRight, Plus, Search,
  Building2, Navigation, Pencil, Trash2,
  LayoutGrid, List, BarChart2, ChevronUp,
} from 'lucide-react'
import { ConfirmModal }         from '@/customComponents/ConfirmModal'
import { SheetTemplate }        from '@/customComponents/SheetTemplate'
import { ButtonTemplate }       from '@/customComponents/ButtonTemplate'
import { InputTemplate }        from '@/customComponents/InputTemplate'
import { SelectTemplate }       from '@/customComponents/SelectTemplate'
import { BadgeTemplate }        from '@/customComponents/BadgeTemplate'
import { CheckboxTemplate }     from '@/customComponents/CheckboxTemplate'
import { FileUploadTemplate }   from '@/customComponents/FileUploadTemplate'
import { fetchCommunities, fetchCooperatives, fetchRegions } from '../_logics/functions'
import { PaginationBar } from '@/customComponents/PaginationBar'
import type {
  Community, Cooperative, RegionOption, SocialAmenities, AmenityEntry,
} from '../_logics/interface'

// ─── Constants ──────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  rural: 'Rural', urban: 'Urban', peri_urban: 'Peri-Urban',
}
const STATUS_VARIANT: Record<string, 'success' | 'info' | 'warning'> = {
  rural: 'success', urban: 'info', peri_urban: 'warning',
}
const AMENITY_KEYS: { key: keyof SocialAmenities; label: string }[] = [
  { key: 'schools',   label: 'Schools' },
  { key: 'hospital',  label: 'Hospital / Clinic' },
  { key: 'police',    label: 'Police Station' },
  { key: 'water',     label: 'Portable Water Source' },
  { key: 'financial', label: 'Financial Institution' },
  { key: 'road',      label: 'Good Road Network' },
  { key: 'network',   label: 'Network Services (MTN, Telecel)' },
]
const CROP_OPTIONS = [
  'Maize','Rice','Cassava','Yam','Groundnut','Soybean',
  'Sorghum','Millet','Cocoa','Coffee','Tomato','Pepper','Plantain','Banana','Pineapple',
]
const ANIMAL_OPTIONS = [
  'Cattle','Goats','Sheep','Pigs','Poultry (Chickens)',
  'Poultry (Turkeys)','Poultry (Ducks)','Rabbits','Donkeys','Other',
]
const INCOME_OPTIONS = ['Farming', 'Trading']

function emptyAmenities(): SocialAmenities {
  const a: AmenityEntry = { present: null, quantity: null, comment: null }
  return { schools: { ...a }, hospital: { ...a }, police: { ...a }, water: { ...a }, financial: { ...a }, road: { ...a }, network: { ...a } }
}

// ─── Shared small components ─────────────────────────────────────────────────

function CompactLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold tracking-widest uppercase mb-1" style={{ color: 'var(--brand-slate)' }}>
      {children}
    </p>
  )
}

function InfoCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2.5">
      <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-gray-800">{value ?? '—'}</p>
    </div>
  )
}

function NoYesToggle({
  value, onChange,
}: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="flex gap-1 shrink-0">
      <button type="button" onClick={() => onChange(false)}
        className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
        style={value === false
          ? { backgroundColor: '#fca5a5', borderColor: '#f87171', color: '#991b1b' }
          : { backgroundColor: '#fff1f2', borderColor: '#fecaca', color: '#f87171' }}
      >No</button>
      <button type="button" onClick={() => onChange(true)}
        className="px-3 py-1 rounded-full text-xs font-medium border transition-colors"
        style={value === true
          ? { backgroundColor: '#86efac', borderColor: '#4ade80', color: '#14532d' }
          : { backgroundColor: '#f0fdf4', borderColor: '#bbf7d0', color: '#16a34a' }}
      >Yes</button>
    </div>
  )
}

function PillToggle({ label, selected, onToggle }: { label: string; selected: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle}
      className="px-3 py-1.5 rounded-full text-xs font-medium border transition-colors"
      style={selected
        ? { backgroundColor: 'var(--brand-dark)', borderColor: 'var(--brand-dark)', color: 'white' }
        : { backgroundColor: 'white', borderColor: '#e5e7eb', color: '#374151' }}
    >{label}</button>
  )
}

function CropPill({ label }: { label: string }) {
  return (
    <span className="px-3 py-1 rounded-full text-xs font-medium border capitalize"
      style={{ backgroundColor: 'var(--brand-mint)', borderColor: 'var(--brand-pale)', color: 'var(--brand-forest)' }}>
      {label}
    </span>
  )
}

function IncomeStreamPill({ label }: { label: string }) {
  return (
    <span className="px-3 py-1 rounded-full text-xs font-medium border capitalize"
      style={{ backgroundColor: 'var(--brand-mint)', borderColor: 'var(--brand-pale)', color: 'var(--brand-forest)' }}>
      {label}
    </span>
  )
}

// ─── Community card ──────────────────────────────────────────────────────────

function CommunityCard({ c, onClick, onRemove }: { c: Community; onClick: () => void; onRemove: () => void }) {
  return (
    <div onClick={onClick}
      className="relative group rounded-xl border border-gray-200 bg-white overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
      <div className="h-32 flex items-center justify-center" style={{ backgroundColor: 'var(--brand-mint)' }}>
        <Building2 className="w-10 h-10" style={{ color: 'var(--brand-green)' }} />
      </div>
      <button
        onClick={e => { e.stopPropagation(); onRemove() }}
        className="absolute top-2 right-2 p-1.5 rounded-lg bg-white/90 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-red-50"
        title="Remove community"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
      <div className="p-4 space-y-2">
        <p className="font-semibold text-gray-900">{c.name}</p>
        <p className="text-xs flex items-center gap-1" style={{ color: 'var(--brand-green)' }}>
          <MapPin className="w-3 h-3 shrink-0" />
          {c.regionName} · {c.district}
        </p>
        {c.socioeconomicStatus && (
          <BadgeTemplate label={STATUS_LABEL[c.socioeconomicStatus]} variant={STATUS_VARIANT[c.socioeconomicStatus]} />
        )}
        {c.leaderName && (
          <p className="text-xs text-gray-600">
            Leader: <span className="font-medium" style={{ color: 'var(--brand-green)' }}>{c.leaderName}</span>
          </p>
        )}
        <div className="flex items-center justify-between pt-1">
          <div className="flex flex-wrap gap-1">
            {c.incomeStreams.map(s => (
              <span key={s} className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 capitalize">{s}</span>
            ))}
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />
        </div>
      </div>
    </div>
  )
}

// ─── Cooperative card ────────────────────────────────────────────────────────

function CoopCard({ c, onClick, onRemove }: { c: Cooperative; onClick: () => void; onRemove: () => void }) {
  return (
    <div onClick={onClick}
      className="relative group rounded-xl border border-gray-200 bg-white p-4 cursor-pointer hover:shadow-md transition-shadow space-y-2.5">
      <div className="flex items-start justify-between">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'var(--brand-mint)' }}>
          <Users className="w-5 h-5" style={{ color: 'var(--brand-green)' }} />
        </div>
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-red-50"
          title="Remove cooperative"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <div>
        <p className="font-semibold text-gray-900">{c.name}</p>
        {c.communityName && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--brand-green)' }}>{c.communityName}</p>
        )}
      </div>
      <p className="text-xs text-gray-500">{c.memberCount} members</p>
      <div className="flex flex-wrap gap-1">
        {[...c.primaryCrops, ...c.secondaryCrops].map(crop => (
          <span key={crop} className="text-[10px] px-2 py-0.5 rounded-full border border-gray-200 text-gray-500 capitalize">{crop}</span>
        ))}
      </div>
      <div className="flex items-center justify-between">
        {c.chairmanName && (
          <p className="text-xs text-gray-500">Chair: <span className="text-gray-700 font-medium">{c.chairmanName}</span></p>
        )}
        <ChevronRight className="w-4 h-4 text-gray-400 ml-auto" />
      </div>
    </div>
  )
}

// ─── List row components ─────────────────────────────────────────────────────

function CommunityListRow({ c, onClick, onRemove }: { c: Community; onClick: () => void; onRemove: () => void }) {
  return (
    <div onClick={onClick}
      className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors group">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--brand-mint)' }}>
        <Building2 className="w-4 h-4" style={{ color: 'var(--brand-green)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
        <p className="text-xs flex items-center gap-1 mt-0.5" style={{ color: 'var(--brand-green)' }}>
          <MapPin className="w-3 h-3 shrink-0" />{c.regionName} · {c.district}
        </p>
      </div>
      {c.socioeconomicStatus && (
        <BadgeTemplate label={STATUS_LABEL[c.socioeconomicStatus]} variant={STATUS_VARIANT[c.socioeconomicStatus]} size="sm" />
      )}
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-red-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </div>
    </div>
  )
}

function CoopListRow({ c, onClick, onRemove }: { c: Cooperative; onClick: () => void; onRemove: () => void }) {
  return (
    <div onClick={onClick}
      className="flex items-center gap-4 px-4 py-3 bg-white border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors group">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--brand-mint)' }}>
        <Users className="w-4 h-4" style={{ color: 'var(--brand-green)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-900 truncate">{c.name}</p>
        {c.communityName && (
          <p className="text-xs mt-0.5" style={{ color: 'var(--brand-green)' }}>{c.communityName}</p>
        )}
      </div>
      <span className="text-xs text-gray-500 shrink-0">{c.memberCount} members</span>
      <div className="flex items-center gap-1 shrink-0">
        <button
          onClick={e => { e.stopPropagation(); onRemove() }}
          className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500 hover:bg-red-50"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
        <ChevronRight className="w-4 h-4 text-gray-300" />
      </div>
    </div>
  )
}

// ─── Community sheet (combined view + edit) ──────────────────────────────────

function CommunitySheet({
  data, regions, onClose, onModeChange, onSave,
}: {
  data: { community: Community | null; mode: 'view' | 'edit' } | null
  regions: RegionOption[]
  onClose: () => void
  onModeChange: (mode: 'view' | 'edit') => void
  onSave: (c: Community) => void
}) {
  const community = data?.community ?? null
  const mode = data?.mode ?? 'view'
  const open = data !== null
  const isNew = !community?.id || community.id.startsWith('new-')
  const isEdit = mode === 'edit'

  // Form state (for edit mode)
  const [name,        setName]        = useState('')
  const [regionCode,  setRegionCode]  = useState('')
  const [district,    setDistrict]    = useState('')
  const [town,        setTown]        = useState('')
  const [status,      setStatus]      = useState('')
  const [streams,     setStreams]      = useState<string[]>([])
  const [otherStream, setOtherStream] = useState('')
  const [amenities,   setAmenities]   = useState<SocialAmenities>(emptyAmenities())
  const [leaderName,  setLeaderName]  = useState('')
  const [leaderTel,   setLeaderTel]   = useState('')

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!isEdit) return
    setName(community?.name ?? '')
    setRegionCode(community?.regionCode ?? '')
    setDistrict(community?.district ?? '')
    setTown(community?.nearestTown ?? '')
    setStatus(community?.socioeconomicStatus ?? '')
    setStreams(community?.incomeStreams.map(s => s.charAt(0).toUpperCase() + s.slice(1)) ?? [])
    setOtherStream(community?.incomeStreamsOther ?? '')
    setAmenities(community?.socialAmenities ?? emptyAmenities())
    setLeaderName(community?.leaderName ?? '')
    setLeaderTel(community?.leaderContact ?? '')
  }, [isEdit])
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  const selectedRegion = regions.find(r => r.code === regionCode)
  const districts = selectedRegion?.districts ?? []

  function toggleStream(s: string) {
    setStreams(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
  }

  function setAmenityPresent(key: keyof SocialAmenities, present: boolean) {
    setAmenities(prev => ({
      ...prev,
      [key]: { ...prev[key], present, quantity: present ? prev[key].quantity : null, comment: present ? prev[key].comment : null },
    }))
  }

  function setAmenityField(key: keyof SocialAmenities, field: 'quantity' | 'comment', val: string) {
    setAmenities(prev => ({
      ...prev,
      [key]: { ...prev[key], [field]: field === 'quantity' ? (val === '' ? null : Number(val)) : val },
    }))
  }

  function handleSave() {
    if (!name.trim() || !regionCode || !district) return
    const rName = regions.find(r => r.code === regionCode)?.name ?? regionCode
    onSave({
      ...(community ?? {}),
      id:                  community?.id ?? `com-${Date.now()}`,
      name:                name.trim(),
      regionCode, regionName: rName, district,
      nearestTown:         town || null,
      socioeconomicStatus: (status as Community['socioeconomicStatus']) || null,
      incomeStreams:       streams.map(s => s.toLowerCase()),
      incomeStreamsOther:  otherStream || null,
      socialAmenities:    amenities,
      gpsLat:              community?.gpsLat ?? null,
      gpsLng:              community?.gpsLng ?? null,
      leaderName:          leaderName || null,
      leaderContact:       leaderTel || null,
      imageUrl:            community?.imageUrl ?? null,
      createdAt:           community?.createdAt ?? new Date().toISOString().slice(0, 10),
    })
  }

  const presentAmenities = community ? AMENITY_KEYS.filter(({ key }) => community.socialAmenities[key].present === true) : []

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      onBack={isEdit && !isNew ? () => onModeChange('view') : undefined}
      title={isEdit ? (isNew ? 'New Community' : 'Edit Community') : (community?.name ?? '')}
      subtitle={!isEdit && community ? `${community.regionName} · ${community.district}` : undefined}
      bodyClassName={isEdit ? 'px-6 py-5 space-y-5' : undefined}
      footer={isEdit ? (
        <>
          <ButtonTemplate variant="outline" size="sm" label="Cancel" fullWidth onClick={onClose} />
          <ButtonTemplate variant="primary" size="sm" fullWidth
            label={isNew ? 'Create Community' : 'Save Changes'}
            isDisabled={!name.trim() || !regionCode || !district}
            onClick={handleSave} />
        </>
      ) : undefined}
    >
      {!isEdit ? (
        <>
          <div className="flex justify-end px-6 pt-4 pb-2">
            <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit"
              leftIcon={<Pencil className="w-3.5 h-3.5" />}
              onClick={() => onModeChange('edit')}
            />
          </div>

          <div className="mx-6 mb-4 h-40 rounded-xl overflow-hidden flex items-center justify-center"
            style={{ backgroundColor: 'var(--brand-mint)' }}>
            <Building2 className="w-12 h-12" style={{ color: 'var(--brand-green)' }} />
          </div>

          <div className="px-6 pb-6 space-y-5">
            {community && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <InfoCell label="Nearest Town"     value={community.nearestTown} />
                  <InfoCell label="Socioeconomic"    value={community.socioeconomicStatus ? STATUS_LABEL[community.socioeconomicStatus] : null} />
                  <InfoCell label="Community Leader" value={community.leaderName} />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <InfoCell label="Leader Contact" value={community.leaderContact} />
                  <InfoCell label="GPS"
                    value={community.gpsLat != null && community.gpsLng != null
                      ? `${community.gpsLat}, ${community.gpsLng}`
                      : null}
                  />
                  <InfoCell label="Farmers Linked" value={0} />
                </div>

                <div>
                  <CompactLabel>Income Streams</CompactLabel>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {community.incomeStreams.map(s => <IncomeStreamPill key={s} label={s} />)}
                  </div>
                </div>

                {presentAmenities.length > 0 && (
                  <div>
                    <CompactLabel>Social Amenities Present</CompactLabel>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {presentAmenities.map(({ key, label }) => {
                        const entry = community.socialAmenities[key]
                        return (
                          <div key={key} className="rounded-lg px-3 py-2.5"
                            style={{ backgroundColor: 'var(--brand-mint)' }}>
                            <div className="flex items-center gap-1.5">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: 'var(--brand-green)' }} />
                              <span className="text-sm font-medium" style={{ color: 'var(--brand-forest)' }}>{label}</span>
                            </div>
                            {entry.quantity != null && (
                              <p className="text-xs text-gray-500 mt-0.5 ml-3.5">Qty: {entry.quantity}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <CompactLabel>Farmers in Community (0)</CompactLabel>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 py-6 text-center mt-2">
                    <p className="text-sm text-gray-400">No farmers linked to this community yet.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <FileUploadTemplate
            label="Community Photo"
            accept="image/*"
            placeholder="Upload community photo"
          />

          <InputTemplate label="Community Name" labelVariant="compact" isRequired
            placeholder="e.g. Akumadan" value={name} onChange={e => setName(e.target.value)} />

          <div className="grid grid-cols-2 gap-3">
            <SelectTemplate label="Region" labelVariant="compact" isRequired
              value={regionCode} onChange={e => { setRegionCode(e.target.value); setDistrict('') }}
              options={regions.map(r => ({ value: r.code, label: r.name }))}
              placeholder="Select region" />
            <SelectTemplate label="District" labelVariant="compact" isRequired
              value={district} onChange={e => setDistrict(e.target.value)}
              options={districts.map(d => ({ value: d, label: d }))}
              placeholder={regionCode ? 'Select district' : 'Select region first'}
              isDisabled={!regionCode} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InputTemplate label="Nearest Town" labelVariant="compact"
              placeholder="e.g. Techiman" value={town} onChange={e => setTown(e.target.value)} />
            <SelectTemplate label="Socioeconomic Status" labelVariant="compact"
              value={status} onChange={e => setStatus(e.target.value)}
              options={[
                { value: 'rural',      label: 'Rural'      },
                { value: 'peri_urban', label: 'Peri-Urban' },
                { value: 'urban',      label: 'Urban'      },
              ]}
              placeholder="Select status" />
          </div>

          <div>
            <CompactLabel>Major Income Streams</CompactLabel>
            <div className="grid grid-cols-2 gap-2 mt-1">
              {INCOME_OPTIONS.map(s => (
                <CheckboxTemplate key={s} label={s}
                  checked={streams.includes(s)} onChange={() => toggleStream(s)} />
              ))}
              <CheckboxTemplate label="Other (specify)"
                checked={streams.includes('Other')} onChange={() => toggleStream('Other')} />
            </div>
            {streams.includes('Other') && (
              <InputTemplate className="mt-2" placeholder="Specify other income streams"
                value={otherStream} onChange={e => setOtherStream(e.target.value)} />
            )}
          </div>

          <div>
            <CompactLabel>Social Amenities</CompactLabel>
            <div className="space-y-3 mt-1">
              {AMENITY_KEYS.map(({ key, label }) => {
                const entry = amenities[key]
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">{label}</span>
                      <NoYesToggle value={entry.present}
                        onChange={v => setAmenityPresent(key, v)} />
                    </div>
                    {entry.present === true && (
                      <div className="mt-2 space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <InputTemplate label="Quantity" labelVariant="compact" type="number"
                            placeholder="e.g. 2"
                            value={entry.quantity?.toString() ?? ''}
                            onChange={e => setAmenityField(key, 'quantity', e.target.value)} />
                          <InputTemplate label="Comment" labelVariant="compact"
                            placeholder="Optional note"
                            value={entry.comment ?? ''}
                            onChange={e => setAmenityField(key, 'comment', e.target.value)} />
                        </div>
                        <FileUploadTemplate
                          variant="compact"
                          label="Photo"
                          accept="image/*"
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div>
            <CompactLabel>GPS Location</CompactLabel>
            <div className="flex items-center gap-3 mt-1">
              <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Capture GPS"
                leftIcon={<Navigation className="w-3.5 h-3.5" />} />
              {community?.gpsLat != null && (
                <span className="text-sm text-gray-500">
                  {community.gpsLat}, {community.gpsLng}
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InputTemplate label="Community Leader Name" labelVariant="compact"
              placeholder="Chief or other leader"
              value={leaderName} onChange={e => setLeaderName(e.target.value)} />
            <InputTemplate label="Leader Contact" labelVariant="compact"
              placeholder="+233 ..."
              value={leaderTel} onChange={e => setLeaderTel(e.target.value)} />
          </div>
        </>
      )}
    </SheetTemplate>
  )
}

// ─── Cooperative sheet (combined view + edit) ────────────────────────────────

function CoopSheet({
  data, communities, onClose, onModeChange, onSave,
}: {
  data: { coop: Cooperative | null; mode: 'view' | 'edit' } | null
  communities: Community[]
  onClose: () => void
  onModeChange: (mode: 'view' | 'edit') => void
  onSave: (c: Cooperative) => void
}) {
  const coop = data?.coop ?? null
  const mode = data?.mode ?? 'view'
  const open = data !== null
  const isNew = !coop?.id || coop.id.startsWith('new-')
  const isEdit = mode === 'edit'

  const [coopName,    setCoopName]    = useState('')
  const [communityId, setCommunityId] = useState('')
  const [members,     setMembers]     = useState('')
  const [primary,     setPrimary]     = useState<string[]>([])
  const [secondary,   setSecondary]   = useState<string[]>([])
  const [animals,     setAnimals]     = useState<string[]>([])
  const [chair,       setChair]       = useState('')
  const [secretary,   setSecretary]   = useState('')

  /* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */
  useEffect(() => {
    if (!isEdit) return
    setCoopName(coop?.name ?? '')
    setCommunityId(coop?.communityId ?? '')
    setMembers(coop?.memberCount?.toString() ?? '')
    setPrimary(coop?.primaryCrops.map(c => c.charAt(0).toUpperCase() + c.slice(1)) ?? [])
    setSecondary(coop?.secondaryCrops.map(c => c.charAt(0).toUpperCase() + c.slice(1)) ?? [])
    setAnimals(coop?.farmAnimals.map(a => a.charAt(0).toUpperCase() + a.slice(1)) ?? [])
    setChair(coop?.chairmanName ?? '')
    setSecretary(coop?.secretaryName ?? '')
  }, [isEdit])
  /* eslint-enable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps */

  function togglePrimary(c: string) {
    setPrimary(prev => prev.includes(c) ? prev.filter(x => x !== c) : prev.length < 2 ? [...prev, c] : prev)
  }
  function toggleSecondary(c: string) {
    setSecondary(prev => prev.includes(c) ? prev.filter(x => x !== c) : prev.length < 2 ? [...prev, c] : prev)
  }
  function toggleAnimal(a: string) {
    setAnimals(prev => prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a])
  }

  function handleSave() {
    if (!coopName.trim()) return
    const comm = communities.find(c => c.id === communityId)
    onSave({
      ...(coop ?? {}),
      id:             coop?.id ?? `coop-${Date.now()}`,
      name:           coopName.trim(),
      communityId:    communityId || null,
      communityName:  comm?.name ?? null,
      communityRegion:comm?.regionName ?? null,
      memberCount:    parseInt(members) || 0,
      primaryCrops:   primary.map(c => c.toLowerCase()),
      secondaryCrops: secondary.map(c => c.toLowerCase()),
      farmAnimals:    animals.map(a => a.toLowerCase()),
      chairmanName:   chair || null,
      secretaryName:  secretary || null,
      createdAt:      coop?.createdAt ?? new Date().toISOString().slice(0, 10),
    })
  }

  return (
    <SheetTemplate
      open={open}
      onClose={onClose}
      onBack={isEdit && !isNew ? () => onModeChange('view') : undefined}
      title={isEdit ? (isNew ? 'New Cooperative / Farmer Group' : 'Edit Cooperative') : (coop?.name ?? '')}
      subtitle={!isEdit && coop?.communityName ? coop.communityName : undefined}
      bodyClassName={isEdit ? 'px-6 py-5 space-y-5' : undefined}
      footer={isEdit ? (
        <>
          <ButtonTemplate variant="outline" size="sm" label="Cancel" fullWidth onClick={onClose} />
          <ButtonTemplate variant="primary" size="sm" fullWidth
            label={isNew ? 'Create Cooperative' : 'Save Changes'}
            isDisabled={!coopName.trim()} onClick={handleSave} />
        </>
      ) : undefined}
    >
      {!isEdit ? (
        <>
          <div className="flex justify-end px-6 pt-4 pb-2">
            <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit"
              leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => onModeChange('edit')} />
          </div>

          <div className="px-6 pb-6 space-y-5">
            {coop && (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <InfoCell label="Members"   value={coop.memberCount} />
                  <InfoCell label="Chairman"  value={coop.chairmanName} />
                  <InfoCell label="Secretary" value={coop.secretaryName} />
                </div>

                {coop.primaryCrops.length > 0 && (
                  <div>
                    <CompactLabel>Primary Crops</CompactLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {coop.primaryCrops.map(c => <CropPill key={c} label={c} />)}
                    </div>
                  </div>
                )}

                {coop.secondaryCrops.length > 0 && (
                  <div>
                    <CompactLabel>Secondary Crops</CompactLabel>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {coop.secondaryCrops.map(c => <CropPill key={c} label={c} />)}
                    </div>
                  </div>
                )}

                <div>
                  <CompactLabel>Farmers in Cooperative (0)</CompactLabel>
                  <div className="rounded-lg border border-gray-100 bg-gray-50 py-6 text-center mt-2">
                    <p className="text-sm text-gray-400">No farmers linked yet.</p>
                  </div>
                </div>
              </>
            )}
          </div>
        </>
      ) : (
        <>
          <InputTemplate label="Group / Cooperative Name" labelVariant="compact" isRequired
            placeholder="e.g. Akumadan Women Farmers Group"
            value={coopName} onChange={e => setCoopName(e.target.value)} />

          <SelectTemplate label="Community" labelVariant="compact"
            value={communityId} onChange={e => setCommunityId(e.target.value)}
            options={communities.map(c => ({
              value: c.id,
              label: c.regionName ? `${c.name} · ${c.regionName}` : c.name,
            } as { value: string; label: string }))}
            placeholder="No community" />

          <InputTemplate label="Number of Group Members" labelVariant="compact"
            type="number" placeholder="e.g. 25"
            value={members} onChange={e => setMembers(e.target.value)} />

          <div>
            <CompactLabel>Primary Crops (up to 2)</CompactLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {CROP_OPTIONS.map(c => (
                <PillToggle key={c} label={c} selected={primary.includes(c)} onToggle={() => togglePrimary(c)} />
              ))}
            </div>
          </div>

          <div>
            <CompactLabel>Secondary Crops (up to 2)</CompactLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {CROP_OPTIONS.map(c => (
                <PillToggle key={c} label={c} selected={secondary.includes(c)} onToggle={() => toggleSecondary(c)} />
              ))}
            </div>
          </div>

          <div>
            <CompactLabel>Farm Animals</CompactLabel>
            <div className="flex flex-wrap gap-2 mt-2">
              {ANIMAL_OPTIONS.map(a => (
                <PillToggle key={a} label={a} selected={animals.includes(a)} onToggle={() => toggleAnimal(a)} />
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InputTemplate label="Chairman Name" labelVariant="compact"
              placeholder="Full name" value={chair} onChange={e => setChair(e.target.value)} />
            <InputTemplate label="Secretary Name" labelVariant="compact"
              placeholder="Full name" value={secretary} onChange={e => setSecretary(e.target.value)} />
          </div>
        </>
      )}
    </SheetTemplate>
  )
}

// ─── Main ────────────────────────────────────────────────────────────────────

export function Main() {
  const [tab,          setTab]          = usePersistedState<'communities' | 'cooperatives'>('cp-tab', 'communities')
  const [communities,  setCommunities]  = useState<Community[]>([])
  const [cooperatives, setCooperatives] = useState<Cooperative[]>([])
  const [regions,      setRegions]      = useState<RegionOption[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,    setSearch]    = usePersistedState('cp-search', '')
  const [viewMode,  setViewMode]  = usePersistedState<'card' | 'list'>('cp-view', 'card')
  const [statsOpen, setStatsOpen] = usePersistedState('cp-stats', false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = usePersistedState('cp-page-size', 12)

  // view / edit state
  const [commSheet, setCommSheet] = useState<{ community: Community | null; mode: 'view' | 'edit' } | null>(null)
  const [coopSheet, setCoopSheet] = useState<{ coop: Cooperative | null; mode: 'view' | 'edit' } | null>(null)
  const [removeCommTarget, setRemoveCommTarget] = useState<Community | null>(null)
  const [removeCoopTarget, setRemoveCoopTarget] = useState<Cooperative | null>(null)

  useEffect(() => {
    Promise.all([fetchCommunities(), fetchCooperatives(), fetchRegions()]).then(
      ([comms, coops, regs]) => {
        setCommunities(comms); setCooperatives(coops); setRegions(regs); setLoading(false)
      }
    )
  }, [])

  const filteredCommunities = communities.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.district.toLowerCase().includes(search.toLowerCase())
  )
  const filteredCooperatives = cooperatives.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    (c.communityName ?? '').toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1)
  }, [filteredCommunities, filteredCooperatives, tab])

  const activeList: (Community | Cooperative)[] = tab === 'communities' ? filteredCommunities : filteredCooperatives
  const paginated = pageSize === 0 ? activeList : activeList.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: 'var(--brand-forest)' }}>Community Profiling</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--brand-slate)' }}>
          Manage community profiles and farmer cooperative/group registrations.
        </p>
      </div>

      {/* Overview stats */}
      {statsOpen && !loading && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {([
            { label: 'Communities',   value: communities.length },
            { label: 'Cooperatives',  value: cooperatives.length },
            { label: 'With Leader',    value: communities.filter(c => !!c.leaderName).length },
            { label: 'Regions Covered', value: new Set(communities.map(c => c.regionName)).size },
          ] as { label: string; value: number }[]).map(({ label, value }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 px-5 py-4">
              <p className="text-[10px] font-semibold tracking-widest uppercase text-gray-400 mb-2">{label}</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--brand-forest)' }}>{value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs + grid toggle */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex gap-1 p-1 rounded-full border border-gray-200 bg-gray-50 w-fit">
          {([
            { key: 'communities',  label: 'Communities',  icon: MapPin },
            { key: 'cooperatives', label: 'Cooperatives', icon: Users  },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button key={key}
              onClick={() => { setTab(key); setSearch('') }}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors"
              style={tab === key
                ? { backgroundColor: 'white', color: 'var(--brand-forest)', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }
                : { color: '#6b7280' }}
            >
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </div>

        <div className="flex gap-0.5 p-1 rounded-lg border border-gray-200 bg-gray-50">
          <button
            onClick={() => setViewMode('card')}
            title="Card view"
            className="p-1.5 rounded-md transition-colors"
            style={viewMode === 'card'
              ? { backgroundColor: 'white', color: 'var(--brand-forest)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
              : { color: '#9ca3af' }}
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            title="List view"
            className="p-1.5 rounded-md transition-colors"
            style={viewMode === 'list'
              ? { backgroundColor: 'white', color: 'var(--brand-forest)', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }
              : { color: '#9ca3af' }}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Search + action */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 bg-white"
            placeholder={tab === 'communities' ? 'Search communities...' : 'Search cooperatives...'}
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <ButtonTemplate
          variant="secondary" size="sm"
          leftIcon={<BarChart2 className="w-3.5 h-3.5" />}
          rightIcon={<ChevronUp className={cn('w-3.5 h-3.5 transition-transform', !statsOpen && 'rotate-180')} />}
          label="Overview"
          onClick={() => setStatsOpen(v => !v)}
        />
        <ButtonTemplate variant="primary" size="sm"
          label={tab === 'communities' ? 'New Community' : 'New Cooperative'}
          leftIcon={<Plus className="w-4 h-4" />}
          onClick={() => {
            if (tab === 'communities') { setCommSheet({ community: null, mode: 'edit' }) }
            else                       { setCoopSheet({ coop: null, mode: 'edit' }) }
          }}
        />
      </div>

      {/* Pagination */}
      {!loading && (
        <PaginationBar
          page={page}
          pageSize={pageSize}
          total={activeList.length}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          className="mb-3"
        />
      )}

      {/* Content */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1,2,3].map(i => <div key={i} className="h-52 rounded-xl bg-gray-200 animate-pulse" />)}
        </div>
      ) : tab === 'communities' ? (
        filteredCommunities.length === 0
          ? <p className="text-sm text-gray-400 py-12 text-center">No communities found.</p>
          : viewMode === 'card'
            ? <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {paginated.map(c => (
                  <CommunityCard key={c.id} c={c as Community}
                    onClick={() => setCommSheet({ community: c as Community, mode: 'view' })}
                    onRemove={() => setRemoveCommTarget(c as Community)}
                  />
                ))}
              </div>
            : <div className="rounded-xl border border-gray-200 overflow-hidden">
                {paginated.map(c => (
                  <CommunityListRow key={c.id} c={c as Community}
                    onClick={() => setCommSheet({ community: c as Community, mode: 'view' })}
                    onRemove={() => setRemoveCommTarget(c as Community)}
                  />
                ))}
              </div>
      ) : (
        filteredCooperatives.length === 0
          ? <p className="text-sm text-gray-400 py-12 text-center">No cooperatives found.</p>
          : viewMode === 'card'
            ? <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
                {paginated.map(c => (
                  <CoopCard key={c.id} c={c as Cooperative}
                    onClick={() => setCoopSheet({ coop: c as Cooperative, mode: 'view' })}
                    onRemove={() => setRemoveCoopTarget(c as Cooperative)}
                  />
                ))}
              </div>
            : <div className="rounded-xl border border-gray-200 overflow-hidden">
                {paginated.map(c => (
                  <CoopListRow key={c.id} c={c as Cooperative}
                    onClick={() => setCoopSheet({ coop: c as Cooperative, mode: 'view' })}
                    onRemove={() => setRemoveCoopTarget(c as Cooperative)}
                  />
                ))}
              </div>
      )}

      {/* Sheets */}
      <CommunitySheet
        data={commSheet}
        regions={regions}
        onClose={() => setCommSheet(null)}
        onModeChange={mode => setCommSheet(s => s ? { ...s, mode } : null)}
        onSave={saved => {
          setCommunities(prev => {
            const idx = prev.findIndex(c => c.id === saved.id)
            return idx >= 0 ? prev.map(c => c.id === saved.id ? saved : c) : [saved, ...prev]
          })
          setCommSheet(null)
        }}
      />
      <CoopSheet
        data={coopSheet}
        communities={communities}
        onClose={() => setCoopSheet(null)}
        onModeChange={mode => setCoopSheet(s => s ? { ...s, mode } : null)}
        onSave={saved => {
          setCooperatives(prev => {
            const idx = prev.findIndex(c => c.id === saved.id)
            return idx >= 0 ? prev.map(c => c.id === saved.id ? saved : c) : [saved, ...prev]
          })
          setCoopSheet(null)
        }}
      />

      <ConfirmModal
        open={!!removeCommTarget}
        title="Remove community?"
        message={`"${removeCommTarget?.name}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => {
          setCommunities(prev => prev.filter(c => c.id !== removeCommTarget?.id))
          setRemoveCommTarget(null)
        }}
        onCancel={() => setRemoveCommTarget(null)}
      />
      <ConfirmModal
        open={!!removeCoopTarget}
        title="Remove cooperative?"
        message={`"${removeCoopTarget?.name}" will be permanently removed. This cannot be undone.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => {
          setCooperatives(prev => prev.filter(c => c.id !== removeCoopTarget?.id))
          setRemoveCoopTarget(null)
        }}
        onCancel={() => setRemoveCoopTarget(null)}
      />
    </div>
  )
}
