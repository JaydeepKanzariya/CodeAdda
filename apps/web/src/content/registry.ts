import { buildLab } from '@codeadda/content-loader';
import type { Lab } from '@codeadda/core';

const LAB_ORDER = ['sql', 'postgres', 'mongodb', 'redis'];
const LAB_PATH = /content\/([^/]+)\/(.+)$/;

export function buildRegistry(labJsons: Record<string, string>, files: Record<string, string>): Lab[] {
  const byLab = new Map<string, { labJson?: string; files: Record<string, string> }>();
  const entry = (dir: string) => {
    let e = byLab.get(dir);
    if (!e) {
      e = { files: {} };
      byLab.set(dir, e);
    }
    return e;
  };
  for (const [path, raw] of Object.entries(labJsons)) {
    const m = LAB_PATH.exec(path);
    if (m) entry(m[1]!).labJson = raw;
  }
  for (const [path, raw] of Object.entries(files)) {
    const m = LAB_PATH.exec(path);
    if (m) entry(m[1]!).files[m[2]!] = raw;
  }

  const result: Lab[] = [];
  for (const [dir, e] of byLab) {
    if (!e.labJson) continue;
    try {
      result.push(buildLab({ labJson: e.labJson, files: e.files }));
    } catch (err) {
      console.error(`content/${dir}/lab.json is invalid:`, err);
    }
  }
  const rank = (id: string) => {
    const i = LAB_ORDER.indexOf(id);
    return i === -1 ? LAB_ORDER.length : i;
  };
  return result.sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));
}

export const labs: Lab[] = buildRegistry(
  import.meta.glob<string>('../../../../content/*/lab.json', { query: '?raw', import: 'default', eager: true }),
  import.meta.glob<string>(
    ['../../../../content/*/lessons/**/*.md', '../../../../content/*/problems/**/*.md', '../../../../content/*/datasets/*'],
    { query: '?raw', import: 'default', eager: true },
  ),
);

export function getLab(id: string): Lab | undefined {
  return labs.find((l) => l.id === id);
}
