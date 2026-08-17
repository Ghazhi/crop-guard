'use client'

import { useState } from 'react'
import { Sprout, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { usePersistedState } from '@/lib/usePersistedState'
import { type CropDef, BUILT_IN_CROPS } from '@/dataCenter/checkinConfig'
import { ButtonTemplate } from '@/customComponents/ButtonTemplate'

export function CropsSection() {
  const [crops, setCrops] = usePersistedState<CropDef[]>('checkinConfig.crops', BUILT_IN_CROPS)

  const [addingCrop,      setAddingCrop]      = useState(false)
  const [newCropName,     setNewCropName]     = useState('')
  const [editingCropId,   setEditingCropId]   = useState<string | null>(null)
  const [editingCropName, setEditingCropName] = useState('')

  function handleAddCrop() {
    const name = newCropName.trim()
    if (!name) return
    const id = `crop_${Date.now()}`
    const def: CropDef = { id, name }
    setCrops(prev => [...prev, def])
    setNewCropName('')
    setAddingCrop(false)
  }

  function handleSaveCropName(cropId: string) {
    const name = editingCropName.trim()
    if (!name) return
    setCrops(prev => prev.map(c => c.id === cropId ? { ...c, name } : c))
    setEditingCropId(null)
  }

  function handleDeleteCrop(cropId: string) {
    setCrops(prev => prev.filter(c => c.id !== cropId))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sprout className="w-4.5 h-4.5" style={{ color: 'var(--brand-forest)' }} />
          <h2 className="text-base font-bold text-gray-900">Crops</h2>
        </div>
        <ButtonTemplate
          variant="primary" size="sm" label="Add Crop"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => { setAddingCrop(true); setNewCropName('') }}
        />
      </div>

      <div className="bg-(--surface-card) rounded-xl border border-(--brand-pale)/40 overflow-hidden">
        {crops.length === 0 && !addingCrop && (
          <p className="text-sm text-gray-400 text-center py-8">No crops yet. Click &quot;Add Crop&quot; to get started.</p>
        )}
        {crops.map(c => (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50/50 group">
            {editingCropId === c.id ? (
              <input
                autoFocus
                value={editingCropName}
                onChange={e => setEditingCropName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleSaveCropName(c.id); if (e.key === 'Escape') setEditingCropId(null) }}
                className="flex-1 h-8 px-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-(--brand-green)"
              />
            ) : (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800">{c.name}</p>
              </div>
            )}
            <div className="flex items-center gap-1 shrink-0">
              {editingCropId === c.id ? (
                <>
                  <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Save" leftIcon={<Check className="w-3.5 h-3.5" />} onClick={() => handleSaveCropName(c.id)} />
                  <ButtonTemplate variant="ghost" size="sm" isIcon tooltip="Cancel" leftIcon={<X className="w-3.5 h-3.5" />} onClick={() => setEditingCropId(null)} />
                </>
              ) : (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1">
                  <ButtonTemplate variant="outline" size="sm" isIcon tooltip="Edit" leftIcon={<Pencil className="w-3.5 h-3.5" />} onClick={() => { setEditingCropId(c.id); setEditingCropName(c.name) }} />
                  <ButtonTemplate variant="danger" size="sm" isIcon tooltip="Delete" leftIcon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => handleDeleteCrop(c.id)} />
                </div>
              )}
            </div>
          </div>
        ))}

        {addingCrop && (
          <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <input
              autoFocus
              value={newCropName}
              onChange={e => setNewCropName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAddCrop(); if (e.key === 'Escape') setAddingCrop(false) }}
              placeholder="Crop name…"
              className="flex-1 h-8 px-2 text-sm border border-gray-300 rounded-lg outline-none focus:border-(--brand-green)"
            />
            <ButtonTemplate variant="primary" size="sm" label="Save" leftIcon={<Check className="w-3.5 h-3.5" />} onClick={handleAddCrop} />
            <ButtonTemplate variant="ghost" size="sm" label="Cancel" leftIcon={<X className="w-3.5 h-3.5" />} onClick={() => setAddingCrop(false)} />
          </div>
        )}
      </div>
    </div>
  )
}
