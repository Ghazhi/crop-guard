---
name: new-form
description: Add a config-driven form to the form engine and wire a sheet to it, so a tenant admin can edit its fields from Configuration > Forms. Use when creating a create/edit form, or converting a hardcoded one.
arguments: [form-name, page, entity]
---

# Add config-driven form: $form-name

**Sidebar page:** $page
**Entity:** $entity

## Existing forms (grouped by sidebar page)

!`grep -oE "name: '[^']+', page: '[^']+'" src/dataCenter/formEngine.ts | sed "s/name: '//;s/', page: '/\t/;s/'$//" | awk -F'\t' '{g[$2]=g[$2]", "$1} END {for (p in g) printf "%s: %s\n", p, substr(g[p],3)}' | sort || echo "none"`

## Sidebar pages a form may belong to

!`sed -n '/^export const FORM_PAGE_ORDER/,/^\]/p' src/dataCenter/formEngine.ts`

## Field types available

!`sed -n '/^export type FieldType/,/photo.$/p' src/dataCenter/formEngine.ts`

## What the builder UI looks like

`Configuration ▸ Forms` is a three-level accordion. Level 1 is the sidebar page,
level 2 is a form on that page, level 3 is the field list grouped by step:

```
┌────────────────────────────────────────────────────────────────────────┐
│ ▾ Governance                                            [ 11 forms ]   │  ← page (FormDef.page)
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ ▸ Officer                            [ 6 fields ]  ↺ Reset to Default│ ← form (FormDef.name)
│ ├────────────────────────────────────────────────────────────────────┤ │
│ │ ▾ Meeting                            [ 6 fields ]  ↺ Reset to Default│
│ │                                                                    │ │
│ │   DETAILS                                            + Add Field   │ ← step (FormStepDef.name)
│ │  ┌──────────────────────────────────────────────────────────────┐  │ │
│ │  │ ⌃⌄  Cooperative        ⌸ dynamic    [Select]         ✎  🗑    │  │ ← FieldDef rows
│ │  │ ⌃⌄  Meeting Type       ⌸ dynamic    [Select]         ✎  🗑    │  │ │
│ │  │ ⌃⌄  Date                            [Date]           ✎  🗑    │  │ │
│ │  │ ⌃⌄  Attendance Count                [Number]         ✎  🗑    │  │ │
│ │  │ ⌃⌄  Agenda                          [Text]           ✎  🗑    │  │ │
│ │  │ ⌃⌄  Minutes                         [Text]           ✎  🗑    │  │ │
│ │  └──────────────────────────────────────────────────────────────┘  │ │
│ └────────────────────────────────────────────────────────────────────┘ │
├────────────────────────────────────────────────────────────────────────┤
│ ▸ Registry                                               [ 4 forms ]   │
│ ▸ Programs                                               [ 4 forms ]   │
│ ▸ Opportunities                                          [ 1 form  ]   │
│ ▸ Configuration                                         [ 12 forms ]   │
└────────────────────────────────────────────────────────────────────────┘
```

A `required` field shows an amber **Required** badge next to its type badge.
`⌃⌄` reorders within the step; `⌸` shows the option count, or `dynamic` when the
list is supplied at runtime rather than stored in config.

**Row in edit mode** — label, type, required, and (for select/multiselect) the
option list, one per line:

```
┌──────────────────────────────────────────────────────────────────────┐
│ [ Meeting Type            ] [ Select    ▾ ] ☑ Required     ✓    ✕    │
│                                                                      │
│   OPTIONS — ONE PER LINE                                             │
│   ┌────────────────────────────────────────────────────────────────┐ │
│   │ General                                                        │ │
│   │ Executive                                                      │ │
│   │ agm|Annual General Meeting                                     │ │
│   └────────────────────────────────────────────────────────────────┘ │
│   Leave empty for lists the app fills in at runtime (programs,       │
│   cohorts, crops, regions). Use value|Label to keep a stored value   │
│   distinct from its display text.                                    │
└──────────────────────────────────────────────────────────────────────┘
```

The tree above is rendered from exactly this FormDef — nothing else:

```ts
export const GOVERNANCE_MEETING_FORM_ID = 'governance-meeting'
const GOVERNANCE_MEETING_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const GOVERNANCE_MEETING_FIELDS: FieldDef[] = [
  // no `options` and no `optionSource`: both lists are passed in at render time
  // via optionsOverride, so the editor shows them as "dynamic"
  f('cooperativeId', 'Cooperative', 'select', 'details', 1),
  f('meetingType', 'Meeting Type', 'select', 'details', 2),
  f('meetingDate', 'Date', 'date', 'details', 3),
  f('attendanceCount', 'Attendance Count', 'number', 'details', 4),
  f('agenda', 'Agenda', 'text', 'details', 5),
  f('minutes', 'Minutes', 'text', 'details', 6),
]

// in DEFAULT_FORMS:
{ id: GOVERNANCE_MEETING_FORM_ID, name: 'Meeting', page: 'Governance',
  steps: GOVERNANCE_MEETING_STEPS, fields: GOVERNANCE_MEETING_FIELDS },
```

| FormDef property | Where it shows in the UI |
|---|---|
| `page` | level-1 group heading (must be a sidebar name) |
| `name` | level-2 form row |
| `steps[].name` | level-3 step heading, ordered by `order` |
| `field.label` | the row's editable name |
| `field.type` | the blue type badge + which widget the real form renders |
| `field.required` | the amber **Required** badge |
| `field.order` | row position within the step (`⌃⌄` rewrites it) |
| `field.options` | `⌸ N options`; absent ⇒ `⌸ dynamic` |
| `field.key` | never shown — it is the storage key, so it stays fixed |

Edits persist under `FORM_CONFIGS_KEY` in sessionStorage and propagate to every
mounted consumer in the same tab, so an open sheet picks up a config change
without a reload. Being sessionStorage, edits clear on a new session — this is a
prototype store, not a backend.

## Instructions

Two parts: **declare** the form in the engine, then **render** it in the sheet.

### 1. Declare it in `src/dataCenter/formEngine.ts`

Add near the other form defs, then register it in `DEFAULT_FORMS`:

```ts
// ─── $form-name ──────────────────────────────────────────────────────────────

export const ${ENTITY}_FORM_ID = '<kebab-id>'
const ${ENTITY}_STEPS: FormStepDef[] = [{ id: 'details', name: 'Details', order: 1 }]
const ${ENTITY}_FIELDS: FieldDef[] = [
  { ...f('name', 'Name', 'text', 'details', 1, true), placeholder: 'e.g. …' },
  { ...f('ownerId', 'Owner', 'select', 'details', 2), optionSource: 'partners' },
  f('startDate', 'Start Date', 'date', 'details', 3),
  f('notes', 'Notes', 'textarea', 'details', 4),
]

// in DEFAULT_FORMS:
{ id: ${ENTITY}_FORM_ID, name: '$form-name', page: '$page', steps: ${ENTITY}_STEPS, fields: ${ENTITY}_FIELDS },
```

`f(key, label, type, stepId, order, required?, options?)` is the local helper. Spread it (`{ ...f(…), extra }`) only when adding optional metadata: `placeholder`, `hint`, `fullWidth`, `min`/`max`/`step`, `visibleWhen`, `requiredWhen`, `optionSource`, `dependsOn`.

**`page` must be one of `FORM_PAGE_ORDER`** — those are the sidebar names, and they are the top-level groups in Configuration > Forms. A form filed under anything else falls into the last group instead of getting its own heading.

Multi-step (wizard) forms declare one `FormStepDef` per step and set each field's `stepId` accordingly.

### 2. Render it in the sheet

```tsx
import { DynamicFormRenderer } from '@/customComponents/DynamicFormRenderer'
import { useFormConfig } from '@/lib/useFormConfig'
import { useDynamicFieldOptions } from '@/lib/useDynamicFieldOptions'
import { ${ENTITY}_FORM_ID } from '@/dataCenter/formEngine'

// Field list, order, labels and required-ness all come from Configuration > Forms.
const config = useFormConfig(${ENTITY}_FORM_ID)
const step = config.steps[0]
const options = useDynamicFieldOptions({ extra: { ownerId: OWNER_OPTIONS } })

const values: Record<string, unknown> = { name, ownerId, startDate, notes }

const valid = config.isValid(values)

{step && (
  <DynamicFormRenderer
    form={config.form}
    stepId={step.id}
    values={values}
    onChange={setValue}
    optionsOverride={options}
    columns={2}
  />
)}
```

`useFormConfig` returns `{ form, steps, fields, visibleFields, isStepValid, isValid, missingLabels }`. Drive validation from `isValid` / `missingLabels` — never re-hardcode a required-field check, or an admin's config change won't take effect.

Renderer props: `labelVariant` (`'compact'` for uppercase labels), `columns` (`2` to match a two-column sheet), `placeholders`, `omitKeys` (fields this screen doesn't show), `disabledKeys` (fields gated behind an earlier choice).

## Rules

- **Behaviour must not change when config is untouched.** The FormDef must reproduce the sheet's real field list, order, labels, placeholders, and its *enforced* required set — if a field renders `isRequired` today but nothing blocks save on it, mark it `required: false`.
- **Keep `key` stable.** It is the storage key in the answers bag; renaming it orphans existing records.
- **Dynamic option lists stay out of config.** Anything derived from live data (programs, cohorts, crops, regions, partners, roles) resolves at render time via `useDynamicFieldOptions`; give the FieldDef an `optionSource` (plus `dependsOn` when another field narrows it) and leave `options` empty.
- **Do not force these into config — leave them hardcoded alongside the dynamic block:**
  - repeating groups (rule builders, question/step lists, nested week editors)
  - nested object matrices (e.g. per-amenity present/quantity/comment/photo)
  - create-only password fields (and keep them out of the FormDef)
  - bespoke widgets with no `FieldType` (permission matrices, simulators, review steps)
- **Preserve label↔value round-trips.** Where a form persists a select's *label* rather than its id, build that option list with `value === label`.
- **Conditional fields** use `visibleWhen` / `requiredWhen` rather than JSX branching — a hidden field is never required, which `stepIsValid` already handles.
- Follow the codebase conventions: named exports, `cn()` from `@/lib/utils`, existing `*Template` components, CSS-var colors, `'use client'` only where hooks are used.

## After adding

1. Run `npx tsc --noEmit -p tsconfig.json` and `npx eslint <changed files>` — fix all errors and any new warnings.
2. Confirm the form appears under **$page** in Configuration > Forms, and that opening it lists the expected fields.
3. Show the FormDef you added and the sheet diff.
