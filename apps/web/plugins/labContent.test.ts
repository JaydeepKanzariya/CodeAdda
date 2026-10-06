import { cpSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { generateModules, labContent } from './labContent';

const contentDir = resolve(import.meta.dirname, '../../../content');

/** Calls the plugin's load hook the way Vite would for a resolved virtual id. */
async function loadVirtual(id: string): Promise<string> {
  const plugin = labContent(contentDir);
  const load = plugin.load as (this: unknown, id: string) => Promise<string>;
  return load.call({ error: (m: string) => { throw new Error(m); } }, `\0${id}`);
}

describe('labContent plugin data', () => {
  it('summarises every valid lab and keeps each built lab keyed by folder', async () => {
    const { summaries, labs } = await generateModules(contentDir);
    expect(summaries.map((s) => s.id).sort()).toEqual(['mongodb', 'postgres', 'redis', 'sql']);
    expect(Object.keys(labs).sort()).toEqual(['mongodb', 'postgres', 'redis', 'sql']);
    expect(labs.sql!.id).toBe('sql');
    expect(labs.postgres!.lessons.flatMap((c) => c.items)).toHaveLength(46);
    expect(labs.mongodb!.lessons.flatMap((c) => c.items)).toHaveLength(40);
    expect(labs.redis!.lessons.flatMap((c) => c.items)).toHaveLength(45);
  });

  it('emits each lab as plain prebuilt data, so no parser ships to the browser', async () => {
    const code = await loadVirtual('virtual:lab-content/postgres');
    expect(code.startsWith('export default {')).toBe(true);
    // No import statement or dynamic import (lesson prose inside the JSON strings may say "import").
    expect(code).not.toMatch(/^\s*import[\s({]/m);
    expect(code.split('\n')).toHaveLength(1);
    expect(JSON.parse(code.slice('export default '.length, -1)).id).toBe('postgres');
  });

  it('skips a lab whose lab.json is invalid instead of failing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'labs-'));
    try {
      cpSync(join(contentDir, 'sql'), join(dir, 'sql'), { recursive: true });
      cpSync(join(contentDir, 'sql'), join(dir, 'broken'), { recursive: true });
      writeFileSync(join(dir, 'broken', 'lab.json'), '{ not json');
      const { summaries } = await generateModules(dir);
      expect(summaries.map((s) => s.id)).toEqual(['sql']);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
