'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Identical to useState but backed by sessionStorage.
 * State survives navigation within the same tab but clears on new sessions.
 */
export function usePersistedState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  // always start from `initial` so the first client render matches the server —
  // sessionStorage is only read after mount, then applied (see effect below)
  const [value, setRaw] = useState<T>(initial)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(key)
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored !== null) setRaw(JSON.parse(stored) as T)
    } catch {}
    setHydrated(true)
  }, [key])

  // hydrated flips in the same batch as the restored value, so this never
  // clobbers a just-read stored value with the pre-hydration default
  useEffect(() => {
    if (!hydrated) return
    try { sessionStorage.setItem(key, JSON.stringify(value)) } catch {}
  }, [key, hydrated, value])

  const set = useCallback((v: T | ((prev: T) => T)) => {
    setRaw(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v
      try { sessionStorage.setItem(key, JSON.stringify(next)) } catch {}
      return next
    })
  }, [key])

  return [value, set]
}
