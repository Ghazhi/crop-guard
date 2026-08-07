'use client'

import { useState } from 'react'
import { Sprout, Plus, Pencil, Trash2, Check, X } from 'lucide-react'
import { usePersistedState } from '@/lib/usePersistedState'
import { type CropDef, BUILT_IN_CROPS } from '@/dataCenter/checkinConfig'

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
        <button
          onClick={() => { setAddingCrop(true); setNewCropName('') }}
          className="flex items-center gap-1.5 h-8 px-3 text-xs font-semibold text-white rounded-lg transition-colors hover:opacity-90"
          style={{ background: 'var(--brand-forest)' }}
        >
          <Plus className="w-3.5 h-3.5" /> Add Crop
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
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
                  <button onClick={() => handleSaveCropName(c.id)}
                    className="w-7 h-7 flex items-center justify-center rounded text-green-600 hover:bg-green-50 transition-colors">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditingCropId(null)}
                    className="w-7 h-7 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 transition-colors">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </>
              ) : (
                <>
                  <button onClick={() => { setEditingCropId(c.id); setEditingCropName(c.name) }}
                    className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:text-gray-500 transition-colors opacity-0 group-hover:opacity-100">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDeleteCrop(c.id)}
                    className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
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
            <button onClick={handleAddCrop}
              className="flex items-center gap-1 h-8 px-3 text-xs font-semibold text-white rounded-lg hover:opacity-90"
              style={{ background: 'var(--brand-forest)' }}>
              <Check className="w-3.5 h-3.5" /> Save
            </button>
            <button onClick={() => setAddingCrop(false)}
              className="flex items-center gap-1 h-8 px-3 text-xs text-gray-500 hover:text-gray-700">
              <X className="w-3.5 h-3.5" /> Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
