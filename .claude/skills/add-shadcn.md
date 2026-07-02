---
name: add-shadcn
description: Add a shadcn/ui component to the project. Use when a new shadcn component is needed.
arguments: [component]
---

# Add shadcn component: $component

## Already installed components

!`find src/components/ui -name "*.tsx" 2>/dev/null | sed 's|src/components/ui/||;s|\.tsx||' | sort || echo "none yet"`

## Instructions

1. Run the shadcn add command:

```bash
npx shadcn@latest add $component
```

2. After it completes, show:
   - What file(s) were created
   - The import path to use: `import { ComponentName } from '@/components/ui/$component'`
   - A minimal usage example

If the component is already installed (listed above), say so and show the import path instead.
