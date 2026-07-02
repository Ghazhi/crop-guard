---
name: new-component
description: Scaffold a new React component for the cropguard app using shadcn/ui patterns, Tailwind v4, and TypeScript. Use when asked to create a new component.
arguments: [component-name, description]
---

# Create component: $component-name

**Purpose:** $description

## Existing components

!`find src/components -type f -name "*.tsx" 2>/dev/null || echo "none yet"`

## Current CSS variables

!`grep -E "^\s*--" src/app/globals.css 2>/dev/null | head -20`

## Instructions

Create a new component at `src/components/$component-name.tsx` following these rules:

- Use TypeScript with a named `Props` interface
- Add `'use client'` only if the component uses hooks or browser APIs
- Use `cn()` from `@/lib/utils` for className composition
- Use Tailwind v4 utilities for all styling (no inline styles)
- Use existing CSS variables (--background, --foreground, etc.) for colors
- Import shadcn components from `@/components/ui/` if needed
- Use `lucide-react` for any icons
- Export as a named export

## Template

```tsx
import { cn } from '@/lib/utils'

interface Props {
  className?: string
}

export function $component-name({ className }: Props) {
  return (
    <div className={cn('', className)}>
      {/* content */}
    </div>
  )
}
```

After creating the file, confirm the component name and file path.
