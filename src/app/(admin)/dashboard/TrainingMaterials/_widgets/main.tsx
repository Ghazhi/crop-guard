'use client'

import { useState } from 'react'
import {
  GraduationCap, Plus, Pencil, Trash2, ChevronDown, ChevronRight,
  FileText, Video, Image as ImageIcon, File, Upload, Sprout, Send, Undo2,
} from 'lucide-react'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'
import { BadgeTemplate } from '@/customComponents/BadgeTemplate'
import { InputTemplate } from '@/customComponents/InputTemplate'
import { SheetTemplate } from '@/customComponents/SheetTemplate'
import { DynamicFormRenderer } from '@/customComponents/DynamicFormRenderer'
import { useFormConfig } from '@/lib/useFormConfig'
import { useDynamicFieldOptions } from '@/lib/useDynamicFieldOptions'
import { TRAINING_BUNDLE_FORM_ID, TRAINING_WEEK_FORM_ID } from '@/dataCenter/formEngine'
import { ConfirmModal } from '@/customComponents/ConfirmModal'
import { FileUploadTemplate } from '@/customComponents/FileUploadTemplate'
import { usePersistedState } from '@/lib/usePersistedState'
import { TRAINING_BUNDLES, TRAINING_TEMPLATES, TRAINING_MATERIALS } from '@/dataCenter/trainingMaterials'
import { BUILT_IN_CROPS, cropOptions } from '@/dataCenter/checkinConfig'
import type { TrainingBundle, TrainingTemplate, TrainingMaterial, CropType, MaterialType } from '../_logics/interface'

const TRAINING_CROP_TYPES: CropType[] = ['maize', 'soybean', 'cocoa']
const CROP_OPTIONS: { value: CropType; label: string }[] =
  cropOptions(BUILT_IN_CROPS).filter(
    (o): o is { value: CropType; label: string } => (TRAINING_CROP_TYPES as string[]).includes(o.value)
  )

const CROP_ICON_COLOR: Record<CropType, string> = {
  maize:   '#E8963A',
  soybean: '#2C5F3F',
  cocoa:   '#8B5E3C',
}

const UNSET_WEEK_TITLE = 'Set title'

function isUnsetWeekTitle(title: string) {
  return title.trim().toLowerCase() === UNSET_WEEK_TITLE.toLowerCase()
}

function fileTypeFromName(name: string): MaterialType {
  const ext = name.split('.').pop()?.toLowerCase() ?? ''
  if (['mp4', 'webm', 'mov'].includes(ext)) return 'video'
  if (ext === 'pdf') return 'pdf'
  if (['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext)) return 'image'
  return 'document'
}

function MaterialIcon({ type }: { type: MaterialType }) {
  if (type === 'video') return <Video className="w-4 h-4 text-gray-400" />
  if (type === 'pdf') return <FileText className="w-4 h-4 text-gray-400" />
  if (type === 'image') return <ImageIcon className="w-4 h-4 text-gray-400" />
  return <File className="w-4 h-4 text-gray-400" />
}

function formatSize(kb: number) {
  if (kb >= 1024) return `${(kb / 1024).toFixed(1)} MB`
  return `${kb} KB`
}

export function Main() {
  const [bundles, setBundles]     = usePersistedState<TrainingBundle[]>('tm-bundles', TRAINING_BUNDLES)
  const [templates, setTemplates] = usePersistedState<TrainingTemplate[]>('tm-templates', TRAINING_TEMPLATES)
  const [materials, setMaterials] = usePersistedState<TrainingMaterial[]>('tm-materials', TRAINING_MATERIALS)

  const [expandedBundle, setExpandedBundle] = useState<string | null>('bun-001')
  const [expandedWeek, setExpandedWeek] = useState<string | null>(null)

  const [addingBundle, setAddingBundle] = useState(false)
  const [editingBundle, setEditingBundle] = useState<TrainingBundle | null>(null)
  const [deletingBundle, setDeletingBundle] = useState<TrainingBundle | null>(null)
  const [unpublishTarget, setUnpublishTarget] = useState<{ bundle: TrainingBundle; weekNumber: number } | null>(null)
  const [bundleForm, setBundleForm] = useState<Partial<TrainingBundle>>({})
  const [bundleTitleError, setBundleTitleError] = useState<string | undefined>()

  const [editingTemplate, setEditingTemplate] = useState<TrainingTemplate | null>(null)
  const [templateForm, setTemplateForm] = useState<Partial<TrainingTemplate>>({})

  // Field list, order, labels and required-ness all come from Configuration > Forms.
  const weekConfig = useFormConfig(TRAINING_WEEK_FORM_ID)
  const weekStep = weekConfig.steps[0]

  const [addingMaterialFor, setAddingMaterialFor] = useState<string | null>(null)
  const [materialFile, setMaterialFile] = useState<File | null>(null)
  const [materialLabel, setMaterialLabel] = useState('')
  const [deletingMaterial, setDeletingMaterial] = useState<TrainingMaterial | null>(null)

  function weeksForBundle(bundle: TrainingBundle): TrainingTemplate[] {
    const existing = templates.filter(t => t.bundleId === bundle.id)
    const byWeek = new Map(existing.map(t => [t.weekNumber, t]))
    return Array.from({ length: bundle.totalWeeks }, (_, i) => {
      const week = i + 1
      return byWeek.get(week) ?? {
        id: `tpl-${bundle.id}-${week}`, bundleId: bundle.id, weekNumber: week,
        weekTitle: UNSET_WEEK_TITLE, topic: '', description: '', notes: '',
      }
    })
  }

  function openAddBundle() {
    setBundleForm({ title: '', cropType: 'maize', season: '', description: '', isActive: true, totalWeeks: 8 })
    setBundleTitleError(undefined)
    setAddingBundle(true)
  }

  function saveNewBundle() {
    if (!bundleForm.title?.trim()) { setBundleTitleError('Title is required'); return }
    const b: TrainingBundle = {
      id: `bun-${Date.now()}`,
      title: bundleForm.title ?? '',
      cropType: bundleForm.cropType ?? 'maize',
      season: bundleForm.season ?? '',
      description: bundleForm.description ?? '',
      isActive: bundleForm.isActive ?? true,
      totalWeeks: Number(bundleForm.totalWeeks ?? 8),
      currentWeek: 0,
    }
    setBundles(prev => [...prev, b])
    setAddingBundle(false)
  }

  function saveEditBundle() {
    if (!editingBundle) return
    if (!bundleForm.title?.trim()) { setBundleTitleError('Title is required'); return }
    setBundles(prev => prev.map(b => b.id === editingBundle.id ? { ...b, ...bundleForm, totalWeeks: Number(bundleForm.totalWeeks ?? b.totalWeeks) } as TrainingBundle : b))
    setEditingBundle(null)
  }

  function confirmDeleteBundle() {
    if (!deletingBundle) return
    setBundles(prev => prev.filter(b => b.id !== deletingBundle.id))
    setTemplates(prev => prev.filter(t => t.bundleId !== deletingBundle.id))
    setDeletingBundle(null)
  }

  function pushWeek(bundleId: string, weekNumber: number) {
    setBundles(prev => prev.map(b => b.id === bundleId ? { ...b, currentWeek: Math.max(b.currentWeek, weekNumber) } : b))
  }
  function requestUnpublishWeek(bundle: TrainingBundle, weekNumber: number) {
    // unpublishing anything before the most-recently-published week would also
    // hide already-live later weeks, so confirm before doing that
    if (weekNumber < bundle.currentWeek) {
      setUnpublishTarget({ bundle, weekNumber })
      return
    }
    setBundles(prev => prev.map(b => b.id === bundle.id ? { ...b, currentWeek: weekNumber - 1 } : b))
  }
  function confirmUnpublishWeek() {
    if (!unpublishTarget) return
    const { bundle, weekNumber } = unpublishTarget
    setBundles(prev => prev.map(b => b.id === bundle.id ? { ...b, currentWeek: weekNumber - 1 } : b))
    setUnpublishTarget(null)
  }

  function openEditWeek(week: TrainingTemplate) {
    setTemplateForm(week)
    setEditingTemplate(week)
  }

  function saveWeek() {
    if (!editingTemplate) return
    const updated: TrainingTemplate = {
      ...editingTemplate,
      weekTitle: templateForm.weekTitle?.trim() || UNSET_WEEK_TITLE,
      topic: templateForm.topic ?? '',
      description: templateForm.description ?? '',
      notes: templateForm.notes ?? '',
    }
    setTemplates(prev => {
      const exists = prev.some(t => t.id === updated.id)
      return exists ? prev.map(t => t.id === updated.id ? updated : t) : [...prev, updated]
    })
    setEditingTemplate(null)
  }

  function saveMaterial() {
    if (!addingMaterialFor || !materialFile) return
    const m: TrainingMaterial = {
      id: `mat-${Date.now()}`,
      templateId: addingMaterialFor,
      fileName: materialFile.name,
      fileType: fileTypeFromName(materialFile.name),
      fileSizeKb: Math.round(materialFile.size / 1024),
      displayLabel: materialLabel.trim() || materialFile.name,
    }
    setMaterials(prev => [...prev, m])
    setAddingMaterialFor(null)
    setMaterialFile(null)
    setMaterialLabel('')
  }

  function confirmDeleteMaterial() {
    if (!deletingMaterial) return
    setMaterials(prev => prev.filter(m => m.id !== deletingMaterial.id))
    setDeletingMaterial(null)
  }

  return (
    <div className="flex flex-col gap-4 p-6" style={{ background: 'var(--surface-page)', minHeight: '100vh' }}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <GraduationCap className="w-5 h-5 shrink-0" style={{ color: 'var(--brand-forest)' }} />
            <h1 className="text-xl font-bold text-gray-900 truncate">Training Materials</h1>
          </div>
          <p className="text-sm text-gray-500 ml-7 truncate">Configure weekly agronomy training content by crop</p>
        </div>
        <ButtonTemplate variant="primary" size="sm" label="Add Bundle" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={openAddBundle} />
      </div>

      {bundles.length === 0 ? (
        <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 shadow-sm flex flex-col items-center justify-center py-20 text-gray-400">
          <GraduationCap className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No training bundles yet</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {bundles.map(bundle => {
            const isOpen = expandedBundle === bundle.id
            const weeks = weeksForBundle(bundle)
            return (
              <div key={bundle.id} className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 shadow-sm overflow-hidden">
                <div
                  className="flex flex-wrap sm:flex-nowrap items-center gap-3 p-4 cursor-pointer"
                  onClick={() => setExpandedBundle(isOpen ? null : bundle.id)}
                >
                  {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" /> : <ChevronRight className="w-4 h-4 text-gray-400 shrink-0" />}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: 'var(--brand-mint)' }}>
                    <Sprout className="w-4.5 h-4.5" style={{ color: CROP_ICON_COLOR[bundle.cropType] }} />
                  </div>
                  <div className="min-w-0 flex-1 basis-full sm:basis-auto">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 truncate">{bundle.title}</p>
                      <BadgeTemplate label={bundle.isActive ? 'Active' : 'Inactive'} variant={bundle.isActive ? 'success' : 'neutral'} size="sm" />
                    </div>
                    <p className="text-xs text-gray-400 truncate">
                      {CROP_OPTIONS.find(c => c.value === bundle.cropType)?.label} · {bundle.season} · {bundle.totalWeeks} weeks
                      {bundle.currentWeek > 0 && ` · Week ${bundle.currentWeek} live`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-auto sm:ml-0" onClick={e => e.stopPropagation()}>
                    <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />}
                      onClick={() => { setEditingBundle(bundle); setBundleForm(bundle); setBundleTitleError(undefined) }} />
                    <ButtonTemplate variant="danger" size="sm" isIcon tooltip="Delete" leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                      onClick={() => setDeletingBundle(bundle)} />
                  </div>
                </div>

                {isOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {weeks.map(week => {
                      const weekOpen = expandedWeek === week.id
                      const weekMaterials = materials.filter(m => m.templateId === week.id)
                      return (
                        <div key={week.id}>
                          <div
                            className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 pl-6 sm:pl-12 cursor-pointer hover:bg-gray-50"
                            onClick={() => setExpandedWeek(weekOpen ? null : week.id)}
                          >
                            {weekOpen ? <ChevronDown className="w-3.5 h-3.5 text-gray-300 shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-gray-300 shrink-0" />}
                            <span className="text-xs font-semibold text-gray-400 shrink-0 w-10 sm:w-14">Wk {week.weekNumber}</span>
                            {week.weekNumber <= bundle.currentWeek ? (
                              <BadgeTemplate label="Live" variant="success" size="sm" />
                            ) : (
                              <BadgeTemplate label="Upcoming" variant="neutral" size="sm" />
                            )}
                            <p className={`text-sm flex-1 min-w-0 truncate ${isUnsetWeekTitle(week.weekTitle) ? 'text-gray-300 italic' : 'text-gray-800 font-medium'}`}>
                              {week.weekTitle}
                            </p>
                            <span className="hidden sm:inline text-[11px] text-gray-400 shrink-0">{weekMaterials.length} material{weekMaterials.length !== 1 ? 's' : ''}</span>
                            {week.weekNumber <= bundle.currentWeek ? (
                              <ButtonTemplate variant="ghost" size="xs" isIcon tooltip="Unpublish week" leftIcon={<Undo2 className="w-3 h-3" />}
                                onClick={e => { e.stopPropagation(); requestUnpublishWeek(bundle, week.weekNumber) }} />
                            ) : (
                              <ButtonTemplate variant="ghost" size="xs" isIcon tooltip="Push this week live" leftIcon={<Send className="w-3 h-3" />}
                                onClick={e => { e.stopPropagation(); pushWeek(bundle.id, week.weekNumber) }} />
                            )}
                            <ButtonTemplate variant="ghost" size="xs" isIcon tooltip="Edit week" leftIcon={<Pencil className="w-3 h-3" />}
                              onClick={e => { e.stopPropagation(); openEditWeek(week) }} />
                          </div>

                          {weekOpen && (
                            <div className="pl-6 sm:pl-24 pr-4 pb-4 flex flex-col gap-3">
                              {week.topic && <p className="text-sm font-medium text-gray-700">{week.topic}</p>}
                              {week.description && <p className="text-xs text-gray-500">{week.description}</p>}
                              {week.notes && <p className="text-xs text-gray-400 italic">{week.notes}</p>}

                              {weekMaterials.length === 0 ? (
                                <p className="text-xs text-gray-300">No materials uploaded for this week yet.</p>
                              ) : (
                                <div className="flex flex-col gap-1.5">
                                  {weekMaterials.map(m => (
                                    <div key={m.id} className="flex items-center gap-2.5 rounded-lg border border-gray-100 bg-gray-50 px-3 py-2">
                                      <MaterialIcon type={m.fileType} />
                                      <div className="min-w-0 flex-1">
                                        <p className="text-xs font-medium text-gray-700 truncate">{m.displayLabel}</p>
                                        <p className="text-[10px] text-gray-400">{m.fileName} · {formatSize(m.fileSizeKb)}</p>
                                      </div>
                                      <ButtonTemplate variant="ghost" size="xs" isIcon tooltip="Delete" leftIcon={<Trash2 className="w-3 h-3" />}
                                        onClick={() => setDeletingMaterial(m)} />
                                    </div>
                                  ))}
                                </div>
                              )}

                              <ButtonTemplate variant="outline" size="sm" label="Add Material" leftIcon={<Upload className="w-3.5 h-3.5" />}
                                onClick={() => { setAddingMaterialFor(week.id); setMaterialFile(null); setMaterialLabel('') }} className="self-start" />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Add bundle sheet */}
      <SheetTemplate
        open={addingBundle}
        onClose={() => setAddingBundle(false)}
        title="Add Training Bundle"
        footer={
          <div className="col-span-2 flex justify-end gap-2">
            <ButtonTemplate variant="outline" label="Cancel" onClick={() => setAddingBundle(false)} />
            <ButtonTemplate variant="primary" label="Save" onClick={saveNewBundle} />
          </div>
        }
      >
        <BundleForm form={bundleForm} setForm={setBundleForm} titleError={bundleTitleError} clearTitleError={() => setBundleTitleError(undefined)} />
      </SheetTemplate>

      {/* Edit bundle sheet */}
      <SheetTemplate
        open={!!editingBundle}
        onClose={() => setEditingBundle(null)}
        title="Edit Training Bundle"
        footer={
          <div className="col-span-2 flex justify-end gap-2">
            <ButtonTemplate variant="outline" label="Cancel" onClick={() => setEditingBundle(null)} />
            <ButtonTemplate variant="primary" label="Save" onClick={saveEditBundle} />
          </div>
        }
      >
        <BundleForm form={bundleForm} setForm={setBundleForm} titleError={bundleTitleError} clearTitleError={() => setBundleTitleError(undefined)} />
      </SheetTemplate>

      {/* Edit week sheet */}
      <SheetTemplate
        open={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        title={editingTemplate ? `Edit Week ${editingTemplate.weekNumber}` : ''}
        footer={
          <div className="col-span-2 flex justify-end gap-2">
            <ButtonTemplate variant="outline" label="Cancel" onClick={() => setEditingTemplate(null)} />
            <ButtonTemplate variant="primary" label="Save" onClick={saveWeek} />
          </div>
        }
      >
        {weekStep && (
          <DynamicFormRenderer
            form={weekConfig.form}
            stepId={weekStep.id}
            values={{
              // a placeholder week title reads as empty so the user types a real one
              weekTitle: templateForm.weekTitle != null && isUnsetWeekTitle(templateForm.weekTitle) ? '' : (templateForm.weekTitle ?? ''),
              topic: templateForm.topic ?? '',
              description: templateForm.description ?? '',
              notes: templateForm.notes ?? '',
            }}
            onChange={(k, v) => setTemplateForm({ ...templateForm, [k]: v })}
            className="px-6 py-5"
          />
        )}
      </SheetTemplate>

      {/* Add material sheet */}
      <SheetTemplate
        open={!!addingMaterialFor}
        onClose={() => setAddingMaterialFor(null)}
        title="Add Material"
        footer={
          <div className="col-span-2 flex justify-end gap-2">
            <ButtonTemplate variant="outline" label="Cancel" onClick={() => setAddingMaterialFor(null)} />
            <ButtonTemplate variant="primary" label="Upload" isDisabled={!materialFile} onClick={saveMaterial} />
          </div>
        }
      >
        <div className="px-6 py-5 flex flex-col gap-4">
          <FileUploadTemplate
            label="File"
            accept="video/mp4,video/webm,image/jpeg,image/png,image/webp,application/pdf,.docx,.pptx"
            placeholder="Click to upload video, PDF, image, or document"
            value={materialFile}
            onChange={setMaterialFile}
          />
          <InputTemplate label="Display Label" placeholder="e.g. Land Preparation Guide" value={materialLabel} onChange={e => setMaterialLabel(e.target.value)} />
        </div>
      </SheetTemplate>

      <ConfirmModal
        open={!!deletingBundle}
        title="Delete Bundle"
        message={`Delete "${deletingBundle?.title}"? All its weeks and materials will be removed too.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDeleteBundle}
        onCancel={() => setDeletingBundle(null)}
      />
      <ConfirmModal
        open={!!deletingMaterial}
        title="Delete Material"
        message={`Delete "${deletingMaterial?.displayLabel}"?`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDeleteMaterial}
        onCancel={() => setDeletingMaterial(null)}
      />

      <ConfirmModal
        open={!!unpublishTarget}
        title="Unpublish Week"
        message={unpublishTarget ? `Week ${unpublishTarget.weekNumber} is not the most recently published week — unpublishing it will also hide week ${unpublishTarget.weekNumber + 1} through ${unpublishTarget.bundle.currentWeek}, which are currently live. Continue?` : ''}
        confirmLabel="Unpublish"
        variant="danger"
        onConfirm={confirmUnpublishWeek}
        onCancel={() => setUnpublishTarget(null)}
      />
    </div>
  )
}

function BundleForm({
  form, setForm, titleError, clearTitleError,
}: {
  form: Partial<TrainingBundle>
  setForm: (v: Partial<TrainingBundle>) => void
  titleError?: string
  clearTitleError?: () => void
}) {
  // Field list, order, labels and required-ness all come from Configuration > Forms.
  const config = useFormConfig(TRAINING_BUNDLE_FORM_ID)
  const step = config.steps[0]
  const options = useDynamicFieldOptions({ extra: { cropType: CROP_OPTIONS } })

  const values: Record<string, unknown> = {
    title: form.title ?? '',
    cropType: form.cropType ?? 'maize',
    season: form.season ?? '',
    totalWeeks: form.totalWeeks ?? 8,
    description: form.description ?? '',
  }

  function set(key: string, val: unknown) {
    if (key === 'title') clearTitleError?.()
    setForm({ ...form, [key]: key === 'totalWeeks' ? Number(val) : val })
  }

  if (!step) return null
  return (
    <div className="px-6 py-5">
      <DynamicFormRenderer
        form={config.form}
        stepId={step.id}
        values={values}
        onChange={set}
        optionsOverride={options}
        columns={2}
      />
      {titleError && <p className="text-xs mt-1" style={{ color: 'var(--brand-red)' }}>{titleError}</p>}
    </div>
  )
}
