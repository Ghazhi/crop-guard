'use client'

import { useState, useEffect, useCallback } from 'react'

/**
 * Identical to useState but backed by sessionStorage.
 * State survives navigation within the same tab but clears on new sessions.
 */
export function usePersistedState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  const [value, setRaw] = useState<T>(() => {
    if (typeof window === 'undefined') return initial
    try {
      const stored = sessionStorage.getItem(key)
      return stored !== null ? (JSON.parse(stored) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try { sessionStorage.setItem(key, JSON.stringify(value)) } catch {}
  }, [key, value])

  const set = useCallback((v: T | ((prev: T) => T)) => {
    setRaw(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v
      try { sessionStorage.setItem(key, JSON.stringify(next)) } catch {}
      return next
    })
  }, [key])

  return [value, set]
}
