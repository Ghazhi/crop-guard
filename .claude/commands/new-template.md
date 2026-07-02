Create a new custom component template in `src/customComponents/` following the cropguard conventions.

## Arguments
$ARGUMENTS — format: `ComponentName base-element "description"`
- **ComponentName** — PascalCase name (e.g. `SelectTemplate`, `BadgeTemplate`)
- **base-element** — shadcn component or HTML element it wraps (e.g. `select`, `button`, `input`, `div`)
- **description** — what this template does

## Step 1 — Read existing templates
!`ls src/customComponents/`

## Step 2 — Check installed shadcn components
!`ls src/components/ui/`

## Step 3 — Read design tokens
!`grep --color=never "brand" src/app/globals.css`

## Step 4 — Create `src/customComponents/<ComponentName>.tsx`

### Non-negotiable rules
- **Self-closing is compulsory** — `<ComponentName ... />` always, no closing tag, no children
- **`label` prop is compulsory** — all text content goes through `label`, never children
- `leftIcon` / `rightIcon` — only add when icons make sense for this component type
- Tailwind v4 CSS variable syntax: `(--brand-green)` not `[var(--brand-green)]`
- Extend native element props with `React.ComponentProps` so all native props still work
- Use `cn()` from `@/lib/utils` for className composition — caller's `className` always last
- Export the Props interface from the same file
- No `index.ts` barrel — imported directly by path

### File structure
```tsx
import React from 'react'
import { cn } from '@/lib/utils'

export interface <ComponentName>Props extends React.ComponentProps<'element'> {
  /** Text content */
  label: string
  // other named props with JSDoc
}

export function <ComponentName>({ label, className, ...props }: <ComponentName>Props) {
  return (
    <element className={cn('base classes', className)} {...props}>
      {label}
    </element>
  )
}

/*
import { <ComponentName> } from '@/customComponents/<ComponentName>'

<ComponentName label="..." variant="..." size="..." />
<ComponentName label="..." isDisabled isRequired />
*/
```

### Named props by type
**Button-like:** `label`, `variant`, `size`, `isLoading`, `isIcon`, `fullWidth`, `isDisabled`
**Input-like:** `label`, `error`, `hint`, `isDisabled`, `isRequired`, `size`
**Badge/Tag:** `label`, `variant` (success/warning/danger/info/neutral), `size`, `dot`
**Card:** `label`, `subtitle`, `footer`, `isHoverable`, `noPadding`
**Select:** `label`, `options`, `placeholder`, `error`, `hint`, `isDisabled`, `isRequired`, `size`

## Step 5 — Verify
Run `npx tsc --noEmit` and fix any errors.

## Step 6 — Report
Show the file path, Props interface, and usage examples.
