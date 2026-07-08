'use client'

import { useState } from 'react'
import { ChevronDown, X, Check } from 'lucide-react'

export interface MultiSelectTabsOption {
  id:    string
  label: string
}

export interface MultiSelectTabsTemplateProps {
  /** All options — first `visibleCount` are always shown as tabs */
  options:       MultiSelectTabsOption[]
  /** Currently active option id */
  value:         string
  /** Called when the user clicks a tab or selects from the dropdown */
  onChange:      (id: string) => void
  /** How many options to pin as always-visible tabs (default: 4) */
  visibleCount?: number
  /** Label for the overflow dropdown button (default: "More") */
  moreLabel?:    string
}

export function MultiSelectTabsTemplate({
  options,
  value,
  onChange,
  visibleCount = 4,
  moreLabel    = 'More',
}: MultiSelectTabsTemplateProps) {
  const [pinned,  setPinned]  = useState<string[]>([])
  const [open,    setOpen]    = useState(false)

  const visibleTabs   = options.slice(0, visibleCount)
  const overflowOpts  = options.slice(visibleCount)
  const pinnedTabs    = overflowOpts.filter(o => pinned.includes(o.id))

  function togglePin(id: string) {
    setPinned(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function removePin(id: string) {
    togglePin(id)
    if (value === id) onChange(visibleTabs[0]?.id ?? '')
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {/* always-visible tabs + pinned overflow tabs */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 flex-wrap">
        {visibleTabs.map(o => (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              value === o.id
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {o.label}
          </button>
        ))}

        {pinnedTabs.map(o => (
          <span
            key={o.id}
            className={`flex items-center gap-1 pl-3 pr-1 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              value === o.id
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <button type="button" onClick={() => onChange(o.id)}>{o.label}</button>
            <button
              type="button"
              onClick={() => removePin(o.id)}
              className="ml-0.5 w-4 h-4 flex items-center justify-center rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      {/* overflow multi-select dropdown */}
      {overflowOpts.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors whitespace-nowrap"
          >
            {moreLabel}
            {pinned.length > 0 && (
              <span
                className="flex items-center justify-center w-4 h-4 rounded-full text-[10px] font-bold text-white"
                style={{ background: 'var(--brand-forest)' }}
              >
                {pinned.length}
              </span>
            )}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl border border-gray-200 shadow-lg py-1 min-w-40">
                {overflowOpts.map(o => {
                  const checked = pinned.includes(o.id)
                  return (
                    <button
                      key={o.id}
                      type="button"
                      onClick={() => {
                        togglePin(o.id)
                        if (!checked) onChange(o.id)
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-sm hover:bg-gray-50 transition-colors text-left"
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                          checked ? 'border-transparent' : 'border-gray-300'
                        }`}
                        style={checked ? { background: 'var(--brand-forest)' } : {}}
                      >
                        {checked && <Check className="w-2.5 h-2.5 text-white" />}
                      </span>
                      <span className={checked ? 'text-gray-900 font-medium' : 'text-gray-600'}>
                        {o.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

/*
import { MultiSelectTabsTemplate } from '@/customComponents/MultiSelectTabsTemplate'

// options — id + label pairs; first `visibleCount` are always-visible tabs,
// the rest live in the "More" overflow dropdown with checkboxes.

<MultiSelectTabsTemplate
  options={crops.map(c => ({ id: c.id, label: c.name }))}
  value={selectedCrop}
  onChange={id => setSelectedCrop(id)}
  visibleCount={4}
  moreLabel="More"
/>
*/
