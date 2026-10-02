import type { Lab } from '@codeadda/core';
import type { UpcomingLab } from '../content/registry';
import { flatItems, itemPath } from '../lab/navigation';
import type { IconName } from './icons';

// Pure data and helpers for the home page. No React, and only a type-only import from the registry (erased at build time), so node tests can load it.

export interface LabStats {
  chapters: number;
  lessons: number;
  problems: number;
  /** Lessons that ship a "Watch it happen" step script. */
  animated: number;
  total: number;
  firstLesson?: string;
  firstProblem?: string;
}

export function labStats(lab: Lab): LabStats {
  const lessons = flatItems(lab, 'lessons');
  const problems = flatItems(lab, 'problems');
  return {
    chapters: lab.lessons.length,
    lessons: lessons.length,
    problems: problems.length,
    animated: lessons.filter((i) => i.steps).length,
    total: lessons.length + problems.length,
    firstLesson: lessons[0] ? itemPath(lab.id, 'lessons', lessons[0].id) : undefined,
    firstProblem: problems[0] ? itemPath(lab.id, 'problems', problems[0].id) : undefined,
  };
}

export type Tone = 'comment' | 'keyword' | 'function' | 'number' | 'plain';
export type Token = [Tone, string];

export interface HeroDemo {
  file: string;
  crumb: string;
  lines: Token[][];
  columns: readonly [string, string];
  rows: readonly (readonly [string, number])[];
}

/**
 * The hero's example. The rows are the real answer on content/sql/datasets/shop.sql
 * (India ×3, USA ×3, Japan ×2, every other country ×1); scripts/homeDemo.test.ts re-runs it on PGlite.
 */
export const HERO_DEMO: HeroDemo = {
  file: 'shoppers.sql',
  crumb: 'SQL Lab · Grouping Data',
  lines: [
    [['comment', '-- Countries with 2+ shoppers']],
    [['keyword', 'SELECT'], ['plain', ' country, '], ['function', 'COUNT'], ['plain', '(*) '], ['keyword', 'AS'], ['plain', ' shoppers']],
    [['keyword', 'FROM'], ['plain', ' users']],
    [['keyword', 'GROUP BY'], ['plain', ' country']],
    [['keyword', 'HAVING'], ['plain', ' '], ['function', 'COUNT'], ['plain', '(*) > '], ['number', '1']],
    [['keyword', 'ORDER BY'], ['plain', ' shoppers '], ['keyword', 'DESC'], ['plain', ', country;']],
  ],
  columns: ['country', 'shoppers'],
  rows: [['India', 3], ['USA', 3], ['Japan', 2]],
};

export function demoSql(demo: HeroDemo): string {
  return demo.lines.map((line) => line.map(([, text]) => text).join('')).join('\n');
}

export interface UpcomingCopy {
  tagline: string;
  description: string;
  icon: IconName;
}

/** Card copy for labs that are announced but not built. Adding a name to UPCOMING_LABS without copy here fails typecheck. */
export const UPCOMING_COPY: Record<UpcomingLab, UpcomingCopy> = {
  PostgreSQL: { tagline: 'The Postgres extras', description: 'Planned: JSONB, arrays, indexes and reading a query plan.', icon: 'layers' },
  MongoDB: { tagline: 'Think in documents', description: 'Planned: filter, shape and aggregate JSON-style documents instead of rows.', icon: 'braces' },
  Redis: { tagline: 'Data at memory speed', description: 'Planned: keys, lists, sets and hashes, the pieces behind caches and leaderboards.', icon: 'bolt' },
};

export interface Step {
  title: string;
  body: string;
}

export const STEPS: Step[] = [
  { title: 'Pick a lesson', body: 'Each lesson explains one idea in a few short paragraphs, then hands you a task that puts it to work.' },
  { title: 'Run your query', body: 'Write SQL in the editor and press Run. A Postgres database living in your browser returns real rows.' },
  { title: 'Get a verdict', body: 'CodeAdda compares your result with the expected one and, when they differ, shows you exactly which rows.' },
];

export interface Feature {
  icon: IconName;
  title: string;
  body: (stats?: LabStats) => string;
}

function animates(n: number): string {
  if (n === 0) return 'Lessons animate';
  return n === 1 ? '1 lesson animates' : `${n} lessons animate`;
}

export const FEATURES: Feature[] = [
  { icon: 'chip', title: 'No server, no setup', body: () => 'Postgres runs inside the page itself. No install, no account, and your queries never leave your machine.' },
  { icon: 'check-circle', title: 'Graded on results', body: () => 'Your rows are compared with the expected rows, not the text you typed, so any correct query passes.' },
  { icon: 'eye', title: 'Watch it happen', body: (s) => `${animates(s?.animated ?? 0)} what a clause does, step by step, before you try it yourself.` },
  { icon: 'bookmark', title: 'Your place, saved', body: () => 'Progress and drafts stay in this browser, so you can close the tab and pick up later.' },
];

/** Card description per live lab id; a lab without an entry gets the generic line. */
export const LIVE_DESCRIPTIONS: Record<string, string> = {
  sql: 'From your first SELECT to joins, CTEs and window functions, all on one realistic shop database.',
  postgres: 'From your first table to JSONB, window functions and indexes, all on a food-delivery database.',
};
export const LIVE_DESCRIPTION_FALLBACK = 'Short lessons, a live database and an instant check, all inside your browser.';

const WORDS = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const word = (n: number): string => WORDS[n] ?? String(n);

export function labsHeadline(live: number, soon: number): string {
  const open = live === 0 ? 'No lab is open yet.' : live === 1 ? 'One lab is open.' : `${word(live)} labs are open.`;
  if (soon === 0) return open;
  return `${open} ${word(soon)} more ${soon === 1 ? 'is' : 'are'} cooking.`;
}

export function labsLead(liveNames: string[], soon: number): string {
  const base = 'Every lab pairs short lessons with a live database and an instant check.';
  if (liveNames.length === 0) return `${base} The first lab is being written.`;
  const ready = `${liveNames.join(' and ')} ${liveNames.length === 1 ? 'is' : 'are'} ready now`;
  return soon === 0 ? `${base} ${ready}.` : `${base} ${ready}; the others are being written.`;
}

/** Hero pill: unchanged wording with one lab, a count of labs and exercises with more. */
export function heroPill(labs: Lab[]): string {
  if (labs.length === 0) return 'Labs opening soon';
  const total = labs.reduce((n, l) => n + labStats(l).total, 0);
  if (labs.length === 1) return `${labs[0]!.title.replace(/\s+Lab$/, '')} lab now open · ${total} exercises`;
  return `${word(labs.length)} labs open · ${total} exercises`;
}
