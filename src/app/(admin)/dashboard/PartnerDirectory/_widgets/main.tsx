'use client'

import { useState, useEffect } from 'react'
import { Search, Plus, MapPin, Mail, Building2, ChevronRight, Eye, Trash2, Calendar, Layers, Pencil } from 'lucide-react'
import Link from 'next/link'
import { PersonAvatar } from '@/customComponents/PersonAvatar'
import { ConfirmModal } from '@/customComponents/ConfirmModal'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet'
import { PARTNERS } from '@/dataCenter/partners'
import type { PartnerStatus } from '@/dataCenter/partners'

interface Partner {
  id: string; name: string; type: string; region: string
  contact: string; email: string; status: PartnerStatus
  since: string; programs: number
}

const INITIAL_PARTNERS: Partner[] = PARTNERS.map(p => ({
  ...p,
  programs: 0,
}))

const PARTNER_TYPES = ['Commercial Bank', 'Development Bank', 'Rural Bank', 'MFI', 'NGO / Donor']
const REGIONS       = ['Greater Accra', 'Ashanti', 'Northern', 'Upper East', 'Upper West', 'Brong Ahafo', 'Kumasi', 'National']

const STEPS = ['Organisation', 'Primary Contact', 'Review']

interface AddForm {
  name: string; type: string; region: string; website: string
  contact: string; email: string; phone: string; role: string
}

const EMPTY_FORM: AddForm = { name: '', type: '', region: '', website: '', contact: '', email: '', phone: '', role: '' }

function statusCls(s: PartnerStatus) {
  if (s === 'Active')  return 'bg-green-50 text-green-700 border-green-200'
  if (s === 'Pending') return 'bg-amber-50 text-amber-700 border-amber-200'
  return 'bg-gray-100 text-gray-500 border-gray-200'
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  )
}

function Input({ value, onChange, placeholder, type = 'text', error }: {
  value: string; onChange: (v: string) => void; placeholder?: string; type?: string; error?: string
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className={`w-full h-9 px-3 text-sm border rounded-lg bg-white focus:outline-none focus:ring-1 placeholder:text-gray-400 ${
        error ? 'border-red-300 focus:ring-red-300' : 'border-gray-200 focus:ring-green-300'
      }`} />
  )
}

function Select({ value, onChange, options, placeholder, error }: {
  value: string; onChange: (v: string) => void; options: string[]; placeholder?: string; error?: string
}) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className={`w-full h-9 px-3 text-sm border rounded-lg bg-white focus:outline-none focus:ring-1 text-gray-700 ${
        error ? 'border-red-300 focus:ring-red-300' : 'border-gray-200 focus:ring-green-300'
      }`}>
      <option value="">{placeholder ?? 'Select…'}</option>
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  )
}

// ── Add Partner Sheet ──────────────────────────────────────────────────────────

function AddPartnerSheet({ open, onOpenChange, onSave }: {
  open: boolean; onOpenChange: (v: boolean) => void; onSave: (p: Partner) => void
}) {
  const [step,   setStep]   = useState(0)
  const [form,   setForm]   = useState<AddForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof AddForm, string>>>({})

  function set(k: keyof AddForm) {
    return (v: string) => {
      setForm(f => ({ ...f, [k]: v }))
      setErrors(e => ({ ...e, [k]: undefined }))
    }
  }

  function validate(): boolean {
    const next: typeof errors = {}
    if (step === 0) {
      if (!form.name)   next.name   = 'Organisation name is required'
      if (!form.type)   next.type   = 'Please select a partner type'
      if (!form.region) next.region = 'Please select a region'
    } else if (step === 1) {
      if (!form.contact) next.contact = 'Contact name is required'
      if (!form.email)   next.email   = 'Email address is required'
    }
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleNext() { if (validate()) setStep(s => s + 1) }

  function handleSave() {
    const now = new Date().toISOString().slice(0, 7)
    onSave({
      id:       `p-${Date.now()}`,
      name:     form.name,
      type:     form.type,
      region:   form.region,
      contact:  form.contact,
      email:    form.email,
      status:   'Pending',
      since:    now,
      programs: 0,
    })
    setForm(EMPTY_FORM)
    setErrors({})
    setStep(0)
    onOpenChange(false)
  }

  function handleClose(v: boolean) {
    if (!v) { setForm(EMPTY_FORM); setErrors({}); setStep(0) }
    onOpenChange(v)
  }


  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <SheetTitle>Add Partner</SheetTitle>
          <SheetDescription>Register a new partner organisation</SheetDescription>

          {/* Step indicator */}
          <div className="flex items-center gap-2 pt-3">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  i < step  ? 'bg-green-600 text-white' :
                  i === step ? 'text-white' : 'bg-gray-100 text-gray-400'
                }`} style={i === step ? { backgroundColor: 'var(--brand-forest)' } : {}}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs font-medium ${i === step ? 'text-gray-800' : 'text-gray-400'}`}>{s}</span>
                {i < STEPS.length - 1 && <ChevronRight className="w-3 h-3 text-gray-300 mx-1" />}
              </div>
            ))}
          </div>
        </SheetHeader>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {step === 0 && (
            <>
              <Field label="Organisation Name" error={errors.name}>
                <Input value={form.name} onChange={set('name')} placeholder="e.g. Fidelity Bank Ghana" error={errors.name} />
              </Field>
              <Field label="Partner Type" error={errors.type}>
                <Select value={form.type} onChange={set('type')} options={PARTNER_TYPES} placeholder="Select type…" error={errors.type} />
              </Field>
              <Field label="Region" error={errors.region}>
                <Select value={form.region} onChange={set('region')} options={REGIONS} placeholder="Select region…" error={errors.region} />
              </Field>
              <Field label="Website (optional)">
                <Input value={form.website} onChange={set('website')} placeholder="https://example.com" type="url" />
              </Field>
            </>
          )}

          {step === 1 && (
            <>
              <Field label="Full Name" error={errors.contact}>
                <Input value={form.contact} onChange={set('contact')} placeholder="e.g. Kwame Mensah" error={errors.contact} />
              </Field>
              <Field label="Email Address" error={errors.email}>
                <Input value={form.email} onChange={set('email')} placeholder="kwame@partner.org" type="email" error={errors.email} />
              </Field>
              <Field label="Phone Number (optional)">
                <Input value={form.phone} onChange={set('phone')} placeholder="+233 20 000 0000" />
              </Field>
              <Field label="Job Title (optional)">
                <Input value={form.role} onChange={set('role')} placeholder="e.g. Head of Credit" />
              </Field>
            </>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Organisation</p>
                </div>
                <div className="px-4 py-3 space-y-2 text-sm">
                  <Row label="Name"   value={form.name} />
                  <Row label="Type"   value={form.type} />
                  <Row label="Region" value={form.region} />
                  {form.website && <Row label="Website" value={form.website} />}
                </div>
              </div>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
                  <p className="text-xs font-bold uppercase tracking-wide text-gray-500">Primary Contact</p>
                </div>
                <div className="px-4 py-3 space-y-2 text-sm">
                  <Row label="Name"  value={form.contact} />
                  <Row label="Email" value={form.email} />
                  {form.phone && <Row label="Phone" value={form.phone} />}
                  {form.role  && <Row label="Title" value={form.role} />}
                </div>
              </div>
              <p className="text-xs text-gray-400">The partner will be added with a <strong>Pending</strong> status until activated.</p>
            </div>
          )}
        </div>

        <SheetFooter className="px-6 pb-6 pt-4 border-t border-gray-100 flex-row gap-3">
          {step > 0 && (
            <button onClick={() => setStep(s => s - 1)}
              className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
              Back
            </button>
          )}
          {step < 2 ? (
            <button onClick={handleNext}
              className="flex-1 h-10 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--brand-forest)' }}>
              Next
            </button>
          ) : (
            <button onClick={handleSave}
              className="flex-1 h-10 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--brand-forest)' }}>
              Save Partner
            </button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-gray-400 shrink-0">{label}</span>
      <span className="text-gray-800 font-medium text-right">{value}</span>
    </div>
  )
}

// ── View Partner Sheet ────────────────────────────────────────────────────────

function ViewPartnerSheet({ partner, onClose, onRemove, onEdit }: {
  partner: Partner | null; onClose: () => void; onRemove: (p: Partner) => void; onEdit: (p: Partner) => void
}) {
  if (!partner) return null
  const p = partner
  return (
    <Sheet open={!!partner} onOpenChange={open => { if (!open) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <PersonAvatar name={p.name} size={40} shape="square" />
            <div>
              <SheetTitle className="text-base">{p.name}</SheetTitle>
              <SheetDescription>{p.type}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="flex justify-end px-6 pt-4 pb-2">
          <button
            onClick={() => { onClose(); onEdit(p) }}
            className="flex items-center gap-1.5 h-8 px-3 rounded-lg text-sm font-semibold text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Edit
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-5 space-y-5">
          {/* Status badge */}
          <span className={`inline-flex text-xs font-semibold px-2.5 py-1 rounded-full border ${statusCls(p.status)}`}>{p.status}</span>

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: MapPin,    label: 'Region',   value: p.region },
              { icon: Calendar,  label: 'Partner since', value: p.since },
              { icon: Layers,    label: 'Programs', value: String(p.programs) },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-1">{label}</p>
                <p className="text-sm font-medium text-gray-800 flex items-center gap-1.5">
                  <Icon className="w-3.5 h-3.5 text-gray-400 shrink-0" />{value}
                </p>
              </div>
            ))}
          </div>

          {/* Primary contact */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Primary Contact</p>
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 space-y-2.5">
              <div className="flex items-center gap-3">
                <PersonAvatar name={p.contact} size={36} />
                <p className="font-semibold text-gray-900">{p.contact}</p>
              </div>
              <a href={`mailto:${p.email}`} className="flex items-center gap-2 text-sm text-gray-600 hover:text-blue-600 transition-colors">
                <Mail className="w-3.5 h-3.5 shrink-0 text-gray-400" />{p.email}
              </a>
            </div>
          </div>
        </div>

        <SheetFooter className="px-6 pb-6 pt-4 border-t border-gray-100 flex-row gap-3">
          <button
            onClick={() => { onClose(); onRemove(p) }}
            className="flex items-center gap-2 h-9 px-3 rounded-lg text-sm font-semibold text-red-600 border border-red-200 hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Remove
          </button>
          <button onClick={onClose}
            className="flex-1 h-9 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--brand-forest)' }}>
            Close
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ── Edit Partner Sheet ────────────────────────────────────────────────────────

function EditPartnerSheet({ partner, open, onOpenChange, onSave }: {
  partner: Partner | null; open: boolean; onOpenChange: (v: boolean) => void; onSave: (p: Partner) => void
}) {
  const [name,    setName]    = useState('')
  const [type,    setType]    = useState('')
  const [region,  setRegion]  = useState('')
  const [contact, setContact] = useState('')
  const [email,   setEmail]   = useState('')
  const [status,  setStatus]  = useState<PartnerStatus>('Active')

  useEffect(() => {
    if (open && partner) {
      /* eslint-disable react-hooks/set-state-in-effect */
      setName(partner.name)
      setType(partner.type)
      setRegion(partner.region)
      setContact(partner.contact)
      setEmail(partner.email)
      setStatus(partner.status)
      /* eslint-enable react-hooks/set-state-in-effect */
    }
  }, [open, partner])

  function handleSave() {
    if (!partner || !name.trim()) return
    onSave({ ...partner, name: name.trim(), type, region, contact, email, status })
    onOpenChange(false)
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-gray-100">
          <SheetTitle>Edit Partner</SheetTitle>
          <SheetDescription>{partner?.name}</SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <Field label="Organisation Name">
            <Input value={name} onChange={setName} placeholder="Organisation name" />
          </Field>
          <Field label="Partner Type">
            <Select value={type} onChange={setType} options={PARTNER_TYPES} placeholder="Select type…" />
          </Field>
          <Field label="Region">
            <Select value={region} onChange={setRegion} options={REGIONS} placeholder="Select region…" />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={v => setStatus(v as PartnerStatus)} options={['Active', 'Inactive', 'Pending']} />
          </Field>
          <Field label="Primary Contact Name">
            <Input value={contact} onChange={setContact} placeholder="Full name" />
          </Field>
          <Field label="Contact Email">
            <Input value={email} onChange={setEmail} placeholder="email@example.com" type="email" />
          </Field>
        </div>

        <SheetFooter className="px-6 pb-6 pt-4 border-t border-gray-100 flex-row gap-3">
          <button onClick={() => onOpenChange(false)}
            className="flex-1 h-10 rounded-lg border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSave} disabled={!name.trim()}
            className="flex-1 h-10 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: 'var(--brand-forest)' }}>
            Save Changes
          </button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function Main() {
  const [partners,       setPartners]       = useState<Partner[]>(INITIAL_PARTNERS)
  const [search,         setSearch]         = useState('')
  const [typeFilter,     setTypeFilter]     = useState('')
  const [sheetOpen,      setSheetOpen]      = useState(false)
  const [viewPartner,    setViewPartner]    = useState<Partner | null>(null)
  const [editPartner,    setEditPartner]    = useState<Partner | null>(null)
  const [editOpen,       setEditOpen]       = useState(false)
  const [removeTarget,   setRemoveTarget]   = useState<Partner | null>(null)

  const types     = [...new Set(partners.map(p => p.type))]
  const displayed = partners.filter(p =>
    (!search     || p.name.toLowerCase().includes(search.toLowerCase()) ||
                    p.contact.toLowerCase().includes(search.toLowerCase())) &&
    (!typeFilter || p.type === typeFilter)
  )

  function handleAdd(p: Partner) { setPartners(prev => [p, ...prev]) }

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Partners</h1>
          <p className="text-sm text-gray-500 mt-0.5">{partners.length} registered partner organisations</p>
        </div>
        <button onClick={() => setSheetOpen(true)}
          className="inline-flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: 'var(--brand-forest)' }}>
          <Plus className="w-4 h-4" /> Add Partner
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-52">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full h-9 pl-9 pr-3 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-green-300"
            placeholder="Search partners or contacts…"
            value={search} onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="h-9 px-3 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none"
          value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
          <option value="">All Types</option>
          {types.map(t => <option key={t}>{t}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wide">
                <th className="text-left px-5 py-3">Organisation</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Primary Contact</th>
                <th className="text-left px-4 py-3">Region</th>
                <th className="text-center px-4 py-3">Programs</th>
                <th className="text-center px-4 py-3">Status</th>
                <th className="text-center px-4 py-3">Since</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayed.map(p => (
                <tr key={p.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/dashboard/PartnerDirectory/${p.id}`} className="flex items-center gap-3 group">
                      <PersonAvatar name={p.name} size={32} shape="square" />
                      <span className="font-medium text-gray-900 group-hover:text-green-700 transition-colors">{p.name}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{p.type}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-gray-800">{p.contact}</p>
                    <p className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                      <Mail className="w-3 h-3" />{p.email}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs text-gray-600 flex items-center gap-1">
                      <MapPin className="w-3 h-3 shrink-0" />{p.region}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className="text-sm font-bold text-gray-700">{p.programs}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${statusCls(p.status)}`}>{p.status}</span>
                  </td>
                  <td className="px-4 py-3.5 text-center text-xs text-gray-400">{p.since}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setViewPartner(p)}
                        className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100 transition-colors">
                        <Eye className="w-3.5 h-3.5" /> View
                      </button>
                      <button onClick={() => setRemoveTarget(p)}
                        className="flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" /> Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {displayed.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-12 text-gray-400">
            <Building2 className="w-8 h-8 opacity-30" />
            <p className="text-sm">No partners found</p>
          </div>
        )}
      </div>

      <AddPartnerSheet open={sheetOpen} onOpenChange={setSheetOpen} onSave={handleAdd} />

      <ViewPartnerSheet
        partner={viewPartner}
        onClose={() => setViewPartner(null)}
        onRemove={p => setRemoveTarget(p)}
        onEdit={p => { setEditPartner(p); setEditOpen(true) }}
      />

      <EditPartnerSheet
        partner={editPartner}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={saved => setPartners(prev => prev.map(p => p.id === saved.id ? saved : p))}
      />

      <ConfirmModal
        open={!!removeTarget}
        title="Remove partner?"
        message={`"${removeTarget?.name}" will be permanently removed from the directory.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => {
          setPartners(prev => prev.filter(p => p.id !== removeTarget?.id))
          setRemoveTarget(null)
        }}
        onCancel={() => setRemoveTarget(null)}
      />
    </div>
  )
}
