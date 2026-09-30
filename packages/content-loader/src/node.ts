import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import type { Lab } from '@codeadda/core';
import { buildLab, type LabSource } from './buildLab';

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

export function readLabSource(dir: string): LabSource {
  const files: Record<string, string> = {};
  for (const full of walk(dir)) {
    const rel = relative(dir, full).split(sep).join('/');
    if (rel !== 'lab.json') files[rel] = readFileSync(full, 'utf8');
  }
  return { labJson: readFileSync(join(dir, 'lab.json'), 'utf8'), files };
}

export function loadLabFromDir(dir: string): Lab {
  return buildLab(readLabSource(dir));
}

export function listLabDirs(contentRoot: string): string[] {
  return readdirSync(contentRoot)
    .map((name) => join(contentRoot, name))
    .filter((d) => statSync(d).isDirectory() && existsSync(join(d, 'lab.json')));
}
