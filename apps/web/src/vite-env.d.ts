/// <reference types="vite/client" />
declare module 'virtual:lab-summaries' {
  import type { LabSummary } from '@codeadda/core';
  export const labSummaries: LabSummary[];
}
declare module 'virtual:lab-content' {
  import type { Lab } from '@codeadda/core';
  export const labLoaders: Record<string, () => Promise<{ default: Lab }>>;
}
