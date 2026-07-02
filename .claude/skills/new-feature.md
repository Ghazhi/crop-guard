---
name: new-feature
description: Scaffold a complete feature folder for a new route following the cropguard separation of concerns structure — page, _widgets, _logics, services, interfaces. Use when adding a new route or feature module.
arguments: [route, description]
---

# Create feature: $route

**Purpose:** $description

## Existing features

!`find src/app -mindepth 1 -maxdepth 1 -type d | sed 's|src/app/||' | grep -v "^\." | sort`

## Instructions

Create the full folder structure for `src/app/$route/`:

```
src/app/$route/
├── page.tsx
├── _widgets/
│   └── main.tsx
└── _logics/
    ├── services.ts
    ├── functions.tsx
    └── interface.tsx
```

### `page.tsx` — Next.js entry point, imports main widget only
```tsx
import { Main } from './_widgets/main'

export default function $routePage() {
  return <Main />
}
```

### `_widgets/main.tsx` — composes all widgets for this route
```tsx
'use client'

export function Main() {
  return (
    <div className="flex flex-col flex-1 p-6">
      {/* compose feature widgets here */}
    </div>
  )
}
```

### `_logics/interface.tsx` — TypeScript types for this feature
```tsx
export interface $Route {
  id: string
  // add fields
}

export interface Get$RouteParams {
  // query params
}

export interface Create$RoutePayload {
  // POST body
}
```

### `_logics/functions.tsx` — API call executors using getAxios()
```tsx
import { getAxios } from '@/lib/axios'
import { $routeServices } from './services'

const request = getAxios()

export const Fetch$Routes = async (pageLimit: number, offsetNumber: number, additionalParams?: Record<string, any>) => {
  try {
    const response = await request(
      $routeServices.GetAll$Routes({ limit: `${pageLimit}`, offset: `${offsetNumber}`, ...additionalParams })
    )
    return response
  } catch (error) {
    return error
  }
}
```

### `_logics/services.ts` — request config objects (no fetching, no axios)
```ts
export const $routeServices = {
  GetAll$Routes: (params: string | Record<string, unknown>) => ({
    method: 'GET', url: `/$route`, params
  }),
  Create$Route: (data: Record<string, unknown>) => ({
    method: 'POST', url: `/$route`, data
  }),
  Update$Route: (id: string, data: Record<string, unknown>) => ({
    method: 'PUT', url: `/$route/${id}`, data
  }),
  Delete$Route: (id: string) => ({
    method: 'DELETE', url: `/$route/${id}`
  }),
}
```

Create all files. After creating, show the full folder tree and the URL the page maps to.
