import type { z } from 'zod';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function zodResolver<T extends z.ZodTypeAny>(schema: T): (...args: any[]) => Promise<any> {
  return async (values: unknown) => {
    const result = await schema.safeParseAsync(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    }
    const errors: Record<string, { type: string; message: string }> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.map(String).join('.');
      if (key && !errors[key]) {
        errors[key] = { type: 'manual', message: issue.message };
      }
    }
    return { values: {}, errors };
  };
}
