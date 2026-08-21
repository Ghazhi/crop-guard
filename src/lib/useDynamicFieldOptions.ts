'use client'

import { useMemo } from 'react'
import { useCropOptions } from '@/dataCenter/useCropOptions'
import { COOPERATIVES } from '@/dataCenter/cooperatives'
import { REGIONS, COMMUNITIES } from '@/dataCenter/communityProfile'
import { PARTNERS } from '@/dataCenter/partners'

export interface Option { value: string; label: string }

export interface DynamicOptionSources {
  programs?: { id: string; name: string; cohorts?: { id: string; name: string }[] }[]
  /** Currently selected program id — narrows the cohort list to that program. */
  selectedProgramId?: string
  /** Roles available for assignment (User forms). */
  roles?: { id: string; name: string }[]
  /** Field agents available for assignment. */
  agents?: Option[]
  /** Per-key overrides, applied last — use for form-specific lists (templates, statuses). */
  extra?: Record<string, Option[]>
}

/**
 * Resolves the option lists a config-driven select cannot carry statically,
 * because the choices come from live app data rather than authored config.
 *
 * Keyed by FieldDef.key, matching the `optionSource` names used in the shipped
 * FormDefs. A field whose key is absent here just falls back to its own
 * `options` array in config.
 */
export function useDynamicFieldOptions(sources: DynamicOptionSources = {}): Record<string, Option[]> {
  const crops = useCropOptions()
  const { programs = [], selectedProgramId, roles, agents, extra } = sources

  return useMemo(() => {
    const cohorts = programs.find(p => p.id === selectedProgramId)?.cohorts ?? []
    const map: Record<string, Option[]> = {
      // crops
      primaryCrop:   crops,
      secondaryCrop: crops,
      cropType:      crops,
      crops,
      primary:       crops,
      secondary:     crops,
      // places
      community:     COMMUNITIES.map(c => ({ value: c.name, label: c.name })),
      communityId:   COMMUNITIES.map(c => ({ value: c.id, label: c.name })),
      group:         COOPERATIVES.map(c => ({ value: c.name, label: c.name })),
      cooperativeId: COOPERATIVES.map(c => ({ value: c.id, label: c.name })),
      region:        REGIONS.map(r => ({ value: r.code, label: r.name })),
      regionCode:    REGIONS.map(r => ({ value: r.code, label: r.name })),
      regions:       REGIONS.map(r => ({ value: r.code, label: r.name })),
      // org
      partnerId:     PARTNERS.map(p => ({ value: p.id, label: p.name })),
      // program scope
      programId:     programs.map(p => ({ value: p.id, label: p.name })),
      programName:   programs.map(p => ({ value: p.name, label: p.name })),
      cohortId:      cohorts.map(c => ({ value: c.id, label: c.name })),
    }
    if (roles)  map.roleId = roles.map(r => ({ value: r.id, label: r.name }))
    if (agents) map.agent  = agents
    return extra ? { ...map, ...extra } : map
  }, [crops, programs, selectedProgramId, roles, agents, extra])
}
