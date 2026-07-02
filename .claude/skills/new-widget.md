---
name: new-widget
description: Add a new widget component to an existing feature's _widgets folder. Use when a feature needs a new UI piece (e.g. a table, form, card section) that is specific to that route.
arguments: [feature, widget-name, description]
---

# Create widget: $widget-name

**Feature:** $feature  
**Purpose:** $description

## Existing widgets for $feature

!`find src/app/$feature/_widgets -type f -name "*.tsx" 2>/dev/null | sed 's|src/app/$feature/_widgets/||;s|\.tsx||' | sort || echo "no widgets yet"`

## Feature interfaces available

!`cat src/app/$feature/_logics/interface.tsx 2>/dev/null || echo "no interface file found"`

## Instructions

Create `src/app/$feature/_widgets/$widget-name.tsx`:

Rules:
- This widget is **only** for the `$feature` route — not shared globally
- Import types and functions from `../_logics/` (the feature's own logics folder)
- Use component templates from `@/components/templates/` for UI primitives
- Use `cn()` from `@/lib/utils` for className composition
- Add `'use client'` only if hooks or browser APIs are used

## Template

```tsx
import { cn } from '@/lib/utils'
import type { $Feature } from '../_logics/interface'

interface Props {
  className?: string
}

export function $widget-name({ className }: Props) {
  return (
    <div className={cn('', className)}>
      {/* widget content */}
    </div>
  )
}
```

After creating:
1. Show the file path
2. Show the import line to add in `_widgets/main.tsx`:
   `import { $widget-name } from './$widget-name'`
