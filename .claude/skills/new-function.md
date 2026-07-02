---
name: new-function
description: Add a new endpoint function to a feature's logics/functions.tsx file. Use after adding the service config — this executes the request using the Axios instance.
arguments: [feature, function-name, service-method, description]
---

# Add function: $function-name

**Feature:** $feature  
**Calls service:** $service-method  
**Purpose:** $description

## Current functions.tsx

!`cat src/app/$feature/_logics/functions.tsx 2>/dev/null || echo "file not found"`

## Current services.ts

!`cat src/app/$feature/_logics/services.ts 2>/dev/null || echo "file not found"`

## Instructions

Add `$function-name` to `src/app/$feature/_logics/functions.tsx`.

The pattern:
1. Get the Axios instance via `getAxios()`
2. Call `request()` with the service config from `services.ts`
3. Wrap in try/catch — return the response on success, return the error on failure

### Pattern

```tsx
export const $function-name = async (/* params */) => {
  try {
    const request = getAxios()
    const response = await request(
      $featureServices.$service-method(/* args */)
    )
    return response
  } catch (error) {
    return error
  }
}
```

Rules:
- Always use `getAxios()` to get the request instance — never import axios directly
- Import the service object from `./services` if not already imported
- Match the function signature to what the service method expects
- Do not duplicate an existing function — check current contents above first
- Keep try/catch on every function — return the error, do not throw

After adding, show the full updated `functions.tsx`.
