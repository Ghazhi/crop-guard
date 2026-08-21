'use client'

import { useMemo } from 'react'
import { usePersistedState } from '@/lib/usePersistedState'
import {
  DEFAULT_FORMS, FORM_CONFIGS_KEY, fieldsForStep, visibleFieldsForStep, sortedSteps, stepIsValid,
  fieldIsRequired, fieldHasValue, emptyValueFor,
  type FieldDef, type FormDef, type FormStepDef,
} from '@/dataCenter/formEngine'

export interface FormConfig {
  /** The live FormDef — the admin-edited version when one exists, else the shipped default. */
  form:   FormDef
  steps:  FormStepDef[]
  /** Ordered fields for one step, before visibility filtering. */
  fields: (stepId: string) => FieldDef[]
  /** Ordered fields for one step that are visible given the current answers. */
  visibleFields: (stepId: string, values: Record<string, unknown>) => FieldDef[]
  /** True when every required field in the step is filled. */
  isStepValid: (stepId: string, values: Record<string, unknown>) => boolean
  /** True when every required field across ALL steps is filled. */
  isValid: (values: Record<string, unknown>) => boolean
  /** Labels of required fields in a step that are still empty — for error toasts. */
  missingLabels: (stepId: string, values: Record<string, unknown>) => string[]
}

/**
 * Reads one form's live configuration out of Configuration > Forms.
 *
 * Falls back to the shipped DEFAULT_FORMS entry when an admin has never touched
 * the form, so a config-driven screen renders its original field list on first
 * load. Because it reads through usePersistedState, an edit made in the config
 * editor propagates to any mounted form in the same tab without a reload.
 */
export function useFormConfig(formId: string): FormConfig {
  const [forms] = usePersistedState<FormDef[]>(FORM_CONFIGS_KEY, DEFAULT_FORMS)

  const form = useMemo<FormDef>(() => {
    const configured = forms.find(f => f.id === formId)
    if (configured) return configured
    const fallback = DEFAULT_FORMS.find(f => f.id === formId)
    if (fallback) return fallback
    // Unknown id — render an empty form rather than crashing the page.
    return { id: formId, name: formId, page: 'Other', steps: [], fields: [] }
  }, [forms, formId])

  return useMemo<FormConfig>(() => {
    const steps = sortedSteps(form)
    function missingLabels(stepId: string, values: Record<string, unknown>): string[] {
      return fieldsForStep(form, stepId)
        .filter(f => fieldIsRequired(f, values) && !fieldHasValue(f, values[f.key]))
        .map(f => f.label)
    }
    return {
      form,
      steps,
      fields: (stepId: string) => fieldsForStep(form, stepId),
      visibleFields: (stepId, values) => visibleFieldsForStep(form, stepId, values),
      isStepValid: (stepId, values) => stepIsValid(form, stepId, values),
      isValid: values => steps.every(s => stepIsValid(form, s.id, values)),
      missingLabels,
    }
  }, [form])
}

/** Seeds a values bag from an existing record, so an edit form opens pre-filled. */
export function valuesFromRecord(form: FormDef, record: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const f of form.fields) {
    const v = record[f.key]
    out[f.key] = v ?? emptyValueFor(f)
  }
  return out
}
