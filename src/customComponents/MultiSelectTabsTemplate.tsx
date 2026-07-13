'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'

export interface MultiSelectTabsOption {
  id:    string
  label: string
}

export interface MultiSelectTabsTemplateProps {
  /** All selectable options — the "More" dropdown lists whichever aren't currently shown as tabs */
  options:       MultiSelectTabsOption[]
  /** Currently active option id */
  value:         string
  /** Called when the user clicks a tab or adds one from the dropdown */
  onChange:      (id: string) => void
  /** How many options seed the initial tab row (default: 4) — all of them remain removable */
  visibleCount?: number
  /** Label for the overflow dropdown button (default: "More") */
  moreLabel?:    string
  /** localStorage key — when set, the shown tabs and the active selection persist across reloads */
  storageKey?:   string
}

export function MultiSelectTabsTemplate({
  options,
  value,
  onChange,
  visibleCount = 4,
  moreLabel    = 'More',
  storageKey,
}: MultiSelectTabsTemplateProps) {
  const [shown,    setShown]    = useState<string[]>(() => options.slice(0, visibleCount).map(o => o.id))
  const [open,     setOpen]     = useState(false)
  const [hydrated, setHydrated] = useState(false)
  const restored = useRef(false)
  const tabRefs  = useRef<Map<string, HTMLElement>>(new Map())

  // the active tab can sit outside the scroll container's current viewport —
  // scroll it fully into view so its hover-X isn't clipped
  useEffect(() => {
    tabRefs.current.get(value)?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [value])

  // localStorage is client-only — restore after mount to avoid a hydration mismatch
  useEffect(() => {
    if (!storageKey || restored.current) return
    restored.current = true
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        const saved = JSON.parse(raw) as { shown?: string[]; value?: string }
        const valid = new Set(options.map(o => o.id))
        const savedShown = Array.isArray(saved.shown) ? saved.shown.filter(id => valid.has(id)) : null
        if (savedShown && savedShown.length) setShown(savedShown)
        const visible = new Set(savedShown ?? shown)
        if (saved.value && visible.has(saved.value)) onChange(saved.value)
      }
    } catch { /* corrupt or unavailable storage — fall back to defaults */ }
    setHydrated(true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  // hydrated flips in the same batch as the restored state, so the first
  // write here never clobbers saved data with the pre-restore defaults
  useEffect(() => {
    if (!storageKey || !hydrated) return
    try {
      localStorage.setItem(storageKey, JSON.stringify({ shown, value }))
    } catch { /* storage unavailable */ }
  }, [storageKey, hydrated, shown, value])

  const shownTabs    = shown.map(id => options.find(o => o.id === id)).filter((o): o is MultiSelectTabsOption => !!o)
  const overflowOpts = options.filter(o => !shown.includes(o.id))

  function addTab(id: string) {
    setShown(prev => prev.includes(id) ? prev : [...prev, id])
    onChange(id)
  }

  function removeTab(id: string) {
    if (shown.length <= 1) return // always keep at least one tab visible
    const next = shown.filter(x => x !== id)
    setShown(next)
    if (value === id) onChange(next[0])
  }

  return (
    <div className="flex items-center gap-1 w-full min-w-0">
      {/* tab row — every tab is removable via a hover-revealed X, scrolls horizontally when it overflows */}
      <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto min-w-0 scrollbar-none">
        {shownTabs.map(o => (
          <span
            key={o.id}
            ref={el => { if (el) tabRefs.current.set(o.id, el); else tabRefs.current.delete(o.id) }}
            className={`group flex items-center rounded-lg text-sm font-medium transition-all whitespace-nowrap shrink-0 ${
              value === o.id
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <button type="button" onClick={() => onChange(o.id)} className="pl-4 pr-1 py-1.5">
              {o.label}
            </button>
            <button
              type="button"
              onClick={() => removeTab(o.id)}
              className="mr-1.5 w-4 h-4 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-opacity"
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}
      </div>

      {/* overflow dropdown — lists whatever isn't currently a tab, clicking adds + selects it */}
      {overflowOpts.length > 0 && (
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 text-sm font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-200 transition-colors whitespace-nowrap"
          >
            {moreLabel}
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute left-0 top-full mt-1 z-20 bg-white rounded-xl border border-gray-200 shadow-lg py-1 min-w-40">
                {overflowOpts.map(o => (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => addTab(o.id)}
                    className="w-full flex items-center px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-colors text-left"
                  >
                    {o.label}
                  </button>
                ))}
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

// options — id + label pairs. `visibleCount` of them seed the initial tab row,
// but every tab (seeded or added later) can be removed via a hover-revealed X.
// Removed tabs return to the "More" dropdown, where clicking one adds it back as a tab.
// The tab strip stays on one row and scrolls horizontally when it overflows.
// storageKey (optional) persists the shown tabs + active selection in localStorage.

<MultiSelectTabsTemplate
  options={crops.map(c => ({ id: c.id, label: c.name }))}
  value={selectedCrop}
  onChange={id => setSelectedCrop(id)}
  visibleCount={4}
  moreLabel="More"
  storageKey="myPage.cropTabs"
/>
*/
