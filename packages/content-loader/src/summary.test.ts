import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadLabFromDir } from './node';
import { summarizeLab } from './summary';

describe('summarizeLab', () => {
  it('counts what the home page shows, for both real labs', () => {
    for (const dir of ['sql', 'postgres']) {
      const lab = loadLabFromDir(resolve(import.meta.dirname, '../../../content', dir));
      const lessons = lab.lessons.flatMap((c) => c.items);
      const problems = lab.problems.flatMap((c) => c.items);
      expect(summarizeLab(lab, dir)).toEqual({
        id: lab.id, dir, title: lab.title, subtitle: lab.subtitle, language: lab.language,
        chapters: lab.lessons.length, lessons: lessons.length, problems: problems.length,
        animated: lessons.filter((l) => l.steps).length,
        firstLessonId: lessons[0]?.id, firstProblemId: problems[0]?.id,
      });
    }
  });

  it('leaves the first ids undefined for an empty lab', () => {
    const empty = { id: 'x', title: 'X Lab', subtitle: '', language: 'sql', lessons: [], problems: [], datasets: {}, errors: [] } as never;
    expect(summarizeLab(empty, 'x')).toMatchObject({ lessons: 0, problems: 0, firstLessonId: undefined, firstProblemId: undefined });
  });
});

