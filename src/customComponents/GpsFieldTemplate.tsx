'use client'

import { useState } from 'react'
import { MapPin, RefreshCw, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface GpsFieldTemplateProps {
  value: string
  onChange: (v: string) => void
  /** Field label — configurable so a form config can rename it. */
  label?: string
  isRequired?: boolean
}

/** GPS capture field: auto-capture via the browser geolocation API, with a manual lat/lng fallback. */
export function GpsFieldTemplate({ value, onChange, label = 'GPS LOCATION', isRequired }: GpsFieldTemplateProps) {
  const [capturing, setCapturing] = useState(false)
  const [manual,    setManual]    = useState(false)
  const [lat,       setLat]       = useState('')
  const [lng,       setLng]       = useState('')
  const [error,     setError]     = useState('')

  function capture() {
    if (!navigator.geolocation) { setError('Geolocation not supported by this browser'); return }
    setCapturing(true); setError('')
    navigator.geolocation.getCurrentPosition(
      pos => {
        const la = pos.coords.latitude.toFixed(6)
        const lo = pos.coords.longitude.toFixed(6)
        setLat(la); setLng(lo)
        onChange(`${la}, ${lo}`)
        setCapturing(false)
      },
      err => {
        setError(err.code === 1 ? 'Location permission denied' : 'Unable to retrieve location')
        setCapturing(false)
      },
      { enableHighAccuracy: true, timeout: 10000 },
    )
  }

  function applyManual() {
    const la = parseFloat(lat); const lo = parseFloat(lng)
    if (isNaN(la) || la < -90  || la > 90)  { setError('Latitude must be between -90 and 90');  return }
    if (isNaN(lo) || lo < -180 || lo > 180) { setError('Longitude must be between -180 and 180'); return }
    setError('')
    onChange(`${la.toFixed(6)}, ${lo.toFixed(6)}`)
  }

  const captured = value && !manual

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">
          {label}{isRequired && <span className="text-(--brand-red) ml-0.5">*</span>}
        </p>
        <button
          type="button"
          onClick={() => { setManual(v => !v); setError('') }}
          className="text-[10px] font-medium transition-colors"
          style={{ color: 'var(--brand-green)' }}
        >
          {manual ? 'Use auto-capture' : 'Enter manually'}
        </button>
      </div>

      {!manual ? (
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex-1 flex items-center gap-2 border rounded-xl px-3 h-10 transition-colors',
            captured ? 'border-green-300 bg-green-50' : 'border-gray-200',
          )}>
            <input
              readOnly
              className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
              style={{ color: captured ? 'var(--brand-forest)' : '#9ca3af' }}
              placeholder="Tap to capture location"
              value={value}
            />
            {captured && <Check className="w-3.5 h-3.5 shrink-0 text-green-500" />}
          </div>
          <button
            type="button"
            onClick={capture}
            disabled={capturing}
            className="shrink-0 w-10 h-10 rounded-xl border border-gray-200 flex items-center justify-center hover:border-gray-300 transition-colors disabled:opacity-50"
            style={{ color: 'var(--brand-mid)' }}
            title="Capture GPS"
          >
            {capturing
              ? <RefreshCw className="w-4 h-4 animate-spin" />
              : <MapPin className="w-4 h-4" />}
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">LATITUDE</p>
              <input
                type="number" step="any" placeholder="e.g. 9.408293"
                value={lat} onChange={e => setLat(e.target.value)}
                className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark)"
              />
            </div>
            <div>
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1">LONGITUDE</p>
              <input
                type="number" step="any" placeholder="e.g. -0.851492"
                value={lng} onChange={e => setLng(e.target.value)}
                className="w-full h-10 border border-gray-200 rounded-xl px-3 text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-(--brand-dark)/20 focus:border-(--brand-dark)"
              />
            </div>
          </div>
          <button
            type="button"
            onClick={applyManual}
            className="w-full h-9 rounded-xl border text-sm font-medium transition-colors"
            style={{ borderColor: 'var(--brand-green)', color: 'var(--brand-green)' }}
          >
            Apply Coordinates
          </button>
          {value && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <Check className="w-3 h-3" /> Saved: {value}
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500 flex items-center gap-1"><X className="w-3 h-3" />{error}</p>}
    </div>
  )
}
