import { describe, expect, it } from 'vitest';
import { labUi } from './labUi';

describe('labUi', () => {
  it('returns sql configuration', () => {
    expect(labUi('sql')).toEqual({
      monaco: 'sql',
      editorTitle: 'SQL editor',
      starter: '-- Write your SQL query here\n',
      skipPrompt: 'Already know SQL?',
      problemsSubtitle: 'Original SQL challenges, easy to hard',
      unit: 'rows',
    });
  });

  it('returns mongodb configuration', () => {
    expect(labUi('mongodb')).toEqual({
      monaco: 'javascript',
      editorTitle: 'MongoDB shell',
      starter: '// Write your MongoDB query here\n',
      skipPrompt: 'Already know the MongoDB basics?',
      problemsSubtitle: 'Original MongoDB challenges, easy to hard',
      unit: 'documents',
    });
  });

  it('falls back to sql configuration for redis', () => {
    expect(labUi('redis')).toEqual(labUi('sql'));
  });
});
