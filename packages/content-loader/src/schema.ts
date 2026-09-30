import { z } from 'zod';

export const itemFrontMatter = z
  .object({
    id: z.string().regex(/^[a-z0-9-]+$/, 'id may only contain a-z, 0-9 and -'),
    title: z.string().min(1),
    chapter: z.string().min(1),
    order: z.number().int(),
    dataset: z.string().min(1).optional(),
    check: z.enum(['rows-unordered', 'rows-ordered', 'state', 'custom']).default('rows-unordered'),
    checkQuery: z.string().min(1).optional(),
    difficulty: z.enum(['Easy', 'Medium', 'Hard']).optional(),
  })
  .superRefine((v, ctx) => {
    if ((v.check === 'state' || v.check === 'custom') && !v.checkQuery) {
      ctx.addIssue({ code: 'custom', path: ['checkQuery'], message: `checkQuery is required when check is "${v.check}"` });
    }
  });

export const labJson = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  subtitle: z.string().default(''),
  language: z.enum(['sql', 'mongodb', 'redis']),
  chapters: z.array(z.string().min(1)).min(1),
  problemGroups: z.array(z.string().min(1)).default([]),
  sidebarTitle: z.string().optional(),
  sidebarSubtitle: z.string().optional(),
  problemsSubtitle: z.string().optional(),
});

export function formatZodError(err: z.ZodError): string {
  return err.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`).join('; ');
}
