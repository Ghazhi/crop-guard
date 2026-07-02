---
name: new-template
description: Create a custom component template in src/customComponents/ that wraps a shadcn/ui component or native HTML element with project-specific props and design tokens. Use when building reusables like ButtonTemplate, InputTemplate, SelectTemplate etc.
arguments: [component-name, base-element, description]
---

# Create template: $component-name

**Base:** `$base-element` (shadcn component or native HTML element)
**Purpose:** $description

## Existing templates

!`find src/customComponents -type f -name "*.tsx" 2>/dev/null | sed 's|src/customComponents/||;s|\.tsx||' | sort || echo "none yet"`

## Installed shadcn components

!`find src/components/ui -name "*.tsx" 2>/dev/null | sed 's|src/components/ui/||;s|\.tsx||' | sort || echo "none"`

## Base component source (to understand available props)

!`cat src/components/ui/$base-element.tsx 2>/dev/null | head -60 || echo "using native HTML element"`

## Design tokens available

!`grep -E "^\s+--brand" src/app/globals.css 2>/dev/null | head -20`

## Instructions

Create `src/customComponents/$component-name.tsx`.

### Rules
- Use Tailwind v4 CSS variable syntax: `(--brand-green)` not `[var(--brand-green)]`
- Extend the base element's props with `React.ComponentProps` so all native props still work
- Define **explicit named props** for every meaningful variation — no raw className hacks by callers
- Use `cn()` from `@/lib/utils` to compose classNames — caller's `className` always merges in last
- Export the Props interface so callers can type their usage
- No `index.ts` barrel — file exports directly, imported by path
- **Always self-closing** — every template MUST be usable as `<Template ... />` with no closing tag. This is compulsory, not optional.
- **label prop is compulsory** — any text content must be passed via a `label` prop, never via children.
- `leftIcon` / `rightIcon` props are only added when icons are relevant to the component being built — do not add them by default.

### Named props by component type

**Button**
```ts
label: string               // compulsory — button text, never use children
variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
size?: 'sm' | 'md' | 'lg'
isLoading?: boolean
isIcon?: boolean
fullWidth?: boolean
isDisabled?: boolean
// leftIcon / rightIcon — add only if icons are needed for this button
```

**Input**
```ts
label?: string
error?: string
hint?: string
leftIcon?: React.ReactNode
rightIcon?: React.ReactNode
isDisabled?: boolean
isRequired?: boolean
size?: 'sm' | 'md' | 'lg'
```

**Checkbox / Radio**
```ts
label?: string
hint?: string
error?: string
isDisabled?: boolean
size?: 'sm' | 'md' | 'lg'
```

**Select / Dropdown**
```ts
label?: string
error?: string
hint?: string
placeholder?: string
isDisabled?: boolean
isRequired?: boolean
size?: 'sm' | 'md' | 'lg'
```

**Card**
```ts
title?: string
subtitle?: string
footer?: React.ReactNode
isHoverable?: boolean
noPadding?: boolean
```

**Badge / Tag**
```ts
variant?: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
size?: 'sm' | 'md'
dot?: boolean
```

For any type not listed, infer sensible named props from its purpose.

### Required file structure

```tsx
import React from 'react'
import { cn } from '@/lib/utils'
// import shadcn primitive if applicable:
// import { ShadcnComponent } from '@/components/ui/$base-element'

export interface $component-nameProps extends React.ComponentProps<'element'> {
  /** brief description */
  propName?: type
}

export function $component-name({ className, propName, ...props }: $component-nameProps) {
  return (
    <element
      className={cn('base classes using (--brand-x) syntax', propName && 'conditional', className)}
      {...props}
    />
  )
}

/*
import { $component-name } from '@/customComponents/$component-name'

<$component-name label="..." variant="..." size="..." />
<$component-name label="..." leftIcon={<Icon />} isDisabled />
<$component-name label="..." isLoading={pending} onClick={handleSubmit} />
*/
```

After creating, show:
1. The file path
2. The full Props interface
3. The usage example block
