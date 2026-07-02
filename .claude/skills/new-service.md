---
name: new-service
description: Add a new endpoint config to a feature's logics/services.ts file. Use when adding a new API endpoint config for a feature.
arguments: [feature, service-name, method, endpoint]
---

# Add service config: $service-name

**Feature:** $feature  
**Method:** $method  
**Endpoint:** $endpoint

## Current services.ts

!`cat src/app/$feature/_logics/services.ts 2>/dev/null || echo "file not found"`

## Instructions

Add `$service-name` to the existing service object in `src/app/$feature/_logics/services.ts`.

The services file exports a single const object where each method returns a request config `{ method, url, data?, params? }`. This config is passed to the Axios instance in `functions.tsx`.

### Pattern

```ts
export const $featureServices = {
  // existing entries...

  $service-name: (data: Record<string, unknown>) => {
    return {
      method: '$method',
      url: `/$endpoint`,
      data: data  // use 'params' instead of 'data' for GET requests
    }
  },
}
```

Rules:
- GET requests use `params`, all others use `data`
- For endpoints with an ID: `url: \`/$endpoint/\${id}\``
- Do not replace the existing object — append the new method inside it
- Keep the existing entries intact

After updating, show the full contents of `services.ts`.
