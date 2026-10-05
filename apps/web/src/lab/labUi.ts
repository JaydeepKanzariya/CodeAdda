import type { LabLanguage } from '@codeadda/core';

export interface LabUi {
  monaco: string;
  editorTitle: string;
  starter: string;
  skipPrompt: string;
  problemsSubtitle: string;
  unit: string;
}

const SQL: LabUi = {
  monaco: 'sql',
  editorTitle: 'SQL editor',
  starter: '-- Write your SQL query here\n',
  skipPrompt: 'Already know SQL?',
  problemsSubtitle: 'Original SQL challenges, easy to hard',
  unit: 'rows',
};

const UI: Partial<Record<LabLanguage, LabUi>> = {
  sql: SQL,
  mongodb: {
    monaco: 'javascript',
    editorTitle: 'MongoDB shell',
    starter: '// Write your MongoDB query here\n',
    skipPrompt: 'Already know the MongoDB basics?',
    problemsSubtitle: 'Original MongoDB challenges, easy to hard',
    unit: 'documents',
  },
};

/** Every language-specific label in one place. */
export function labUi(language: LabLanguage): LabUi {
  return UI[language] ?? SQL;
}
