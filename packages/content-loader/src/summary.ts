import type { Lab, LabSummary } from '@codeadda/core';

export function summarizeLab(lab: Lab, dir: string): LabSummary {
  const lessons = lab.lessons.flatMap((c) => c.items);
  const problems = lab.problems.flatMap((c) => c.items);
  return {
    id: lab.id, dir, title: lab.title, subtitle: lab.subtitle, language: lab.language,
    chapters: lab.lessons.length, lessons: lessons.length, problems: problems.length,
    animated: lessons.filter((l) => l.steps).length,
    firstLessonId: lessons[0]?.id, firstProblemId: problems[0]?.id,
  };
}

