'use client'

import { useMemo } from 'react'
import { usePersistedState } from '@/lib/usePersistedState'
import { type CropDef, BUILT_IN_CROPS, cropOptions } from '@/dataCenter/checkinConfig'

/** Shared crop catalog — every consumer reads the same persisted `checkinConfig.crops` list. */
export function useCropOptions(): { value: string; label: string }[] {
  const [crops] = usePersistedState<CropDef[]>('checkinConfig.crops', BUILT_IN_CROPS)
  return useMemo(() => cropOptions(crops), [crops])
}

/** Same shared crop catalog, as plain crop names — used where a string[] is needed (e.g. multi-select of crop names). */
export function useCropNames(): string[] {
  const [crops] = usePersistedState<CropDef[]>('checkinConfig.crops', BUILT_IN_CROPS)
  return useMemo(() => crops.map(c => c.name), [crops])
}
