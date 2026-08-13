'use client'

import { useState, useEffect, useCallback } from 'react'

// Broadcasts writes to every other usePersistedState instance watching the same key
// in this tab, so independent components sharing a key (e.g. a config editor and a
// live-preview consumer) stay in sync without requiring a page reload.
const emitter = typeof EventTarget !== 'undefined' ? new EventTarget() : null
function eventName(key: string) {
  return `persisted-state:${key}`
}

/**
 * Identical to useState but backed by sessionStorage.
 * State survives navigation within the same tab but clears on new sessions.
 * All instances sharing the same key stay in sync within the same tab.
 */
export function usePersistedState<T>(key: string, initial: T): [T, (v: T | ((prev: T) => T)) => void] {
  // always start from `initial` so the first client render matches the server —
  // sessionStorage is only read after mount, then applied (see effect below)
  const [value, setRaw] = useState<T>(initial)
  const [hydrated, setHydrated] = useState(false)
  // tracks which key `value`/`hydrated` currently reflect, so a key change (e.g.
  // switching which org's settings this instance reads) can be detected and the
  // stale value from the previous key discarded before the persist-effect below
  // ever gets a chance to write it into the new key's storage.
  const [loadedKey, setLoadedKey] = useState(key)

  if (key !== loadedKey) {
    setRaw(initial)
    setHydrated(false)
    setLoadedKey(key)
  }

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

  // pick up writes made by other instances of this same key (e.g. a config
  // editor saving while a live-preview consumer is mounted elsewhere)
  useEffect(() => {
    if (!emitter) return
    function onChange(e: Event) {
      const next = (e as CustomEvent<T>).detail
      setRaw(next)
    }
    emitter.addEventListener(eventName(key), onChange)
    return () => emitter.removeEventListener(eventName(key), onChange)
  }, [key])

  const set = useCallback((v: T | ((prev: T) => T)) => {
    setRaw(prev => {
      const next = typeof v === 'function' ? (v as (p: T) => T)(prev) : v
      try { sessionStorage.setItem(key, JSON.stringify(next)) } catch {}
      // deferred so this never calls setState on other components while
      // React is still committing the update that triggered this write
      queueMicrotask(() => emitter?.dispatchEvent(new CustomEvent(eventName(key), { detail: next })))
      return next
    })
  }, [key])

  return [value, set]
}
