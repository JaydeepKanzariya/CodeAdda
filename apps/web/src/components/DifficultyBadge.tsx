import type { Difficulty } from '@codeadda/core';
import { cx } from '../lib/cx';

const TONE: Record<Difficulty, string> = {
  Easy: 'border-ok-line bg-ok-bg text-ok',
  Medium: 'border-warn-line bg-warn-bg text-warn',
  Hard: 'border-bad-line bg-bad-bg text-bad',
};

export function DifficultyBadge({ level }: { level: Difficulty }) {
  return <span className={cx('shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium', TONE[level])}>{level}</span>;
}
