import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadLabFromDir } from '@codeadda/content-loader/node';

const lab = loadLabFromDir(resolve(import.meta.dirname, '../content/redis'));
const lessons = lab.lessons.flatMap((chapter) => chapter.items);
const problems = lab.problems.flatMap((group) => group.items);

describe('Redis lab shape', () => {
  it('has the planned chapters, lessons and animation positions', () => {
    expect(lab.errors).toEqual([]);
    expect(lab.lessons.map((chapter) => chapter.items.length)).toEqual([
      3, 3, 3, 3, 3, 3, 4, 2, 3, 3, 4, 3, 3, 3, 2,
    ]);
    expect(lessons).toHaveLength(45);
    expect(lessons[0]!.title).toBe('Your first key');
    expect(lessons.flatMap((lesson, index) => (lesson.steps ? [index + 1] : []))).toEqual([
      1, 5, 7, 10, 13, 16, 19, 23, 25, 27, 31, 33, 38,
    ]);
  });

  it('gives every lesson distinct explanation, task, hint and context text', () => {
    expect(lessons.filter((lesson) => !lesson.body.trim() || !lesson.context).map((lesson) => lesson.id)).toEqual([]);
    for (const field of ['body', 'task', 'hints'] as const) {
      const values = lessons.map((lesson) => JSON.stringify(lesson[field]));
      expect(new Set(values).size, `${field} text must be unique`).toBe(values.length);
    }
  });

  it('does not reuse long teaching sentences or context snippets', () => {
    const files = [...lessons, ...problems];
    const sentenceFiles = new Map<string, string[]>();
    for (const entry of files) {
      const text = [entry.body, entry.context, entry.task, ...entry.hints, entry.example ?? ''].join(' ');
      for (const sentence of text.split(/(?<=[.!?])\s+/).map((value) => value.trim()).filter(Boolean)) {
        if (sentence.split(/\s+/).length >= 8) {
          const paths = sentenceFiles.get(sentence) ?? [];
          paths.push(entry.path);
          sentenceFiles.set(sentence, paths);
        }
      }
    }
    const repeated = [...sentenceFiles.entries()].filter(([, paths]) => new Set(paths).size > 2);
    expect(repeated, JSON.stringify(repeated, null, 2)).toEqual([]);

    const contexts = lessons.map((lesson) => lesson.context);
    expect(new Set(contexts).size).toBe(contexts.length);
  });

  it('rejects template phrases and keeps contexts tied to the lesson command family', () => {
    const banned = [
      'Describe the result rather than copying a command',
      'Produce exactly this result',
      'demo:key',
      'the same family can operate on',
      'demonstrates the requested Redis operation',
    ];
    for (const item of [...lessons, ...problems]) {
      const text = [item.body, item.context, item.task, ...item.hints, item.example ?? ''].join('\n');
      for (const phrase of banned) expect(text).not.toContain(phrase);
    }
    for (const lesson of lessons) {
      if (lesson.id === 'naming-type') continue;
      const contextCommand = lesson.context?.match(/```redis\s*([\s\S]*?)```/)?.[1] ?? '';
      const solutionCommand = lesson.solution.trim().split(/\s+/)[0];
      expect(contextCommand.toUpperCase(), lesson.id).toContain(solutionCommand.toUpperCase());
    }
  });

  it('uses specific snapshot checks for state lessons', () => {
    const stateLessons = lessons.filter((lesson) => lesson.check === 'state');
    expect(stateLessons.length).toBeGreaterThan(0);
    expect(stateLessons.every((lesson) => lesson.checkQuery?.startsWith('SNAPSHOT '))).toBe(true);
    expect(stateLessons.every((lesson) => lesson.checkQuery !== 'SNAPSHOT *')).toBe(true);
  });

  it('has four Easy, four Medium and four Hard self-contained problems', () => {
    expect(lab.levels).toEqual([
      { title: 'Beginner', from: 'Meet Redis' },
      { title: 'Intermediate', from: 'Sets' },
      { title: 'Advanced', from: 'Streams' },
    ]);
    expect(lab.problems.map((group) => [group.title, group.items.map((problem) => problem.difficulty)])).toEqual([
      ['Warm-up', ['Easy', 'Easy', 'Easy', 'Easy']],
      ['Everyday Redis', ['Medium', 'Medium', 'Medium', 'Medium']],
      ['Production Patterns', ['Hard', 'Hard', 'Hard', 'Hard']],
    ]);
    expect(problems).toHaveLength(12);
    expect(problems.filter((problem) => !problem.setup || !problem.tables || !problem.example || problem.dataset).map((problem) => problem.id)).toEqual([]);
    expect(problems.filter((problem) => problem.solution.trim() === 'GET challenge:seed').map((problem) => problem.id)).toEqual([]);
  });
});
