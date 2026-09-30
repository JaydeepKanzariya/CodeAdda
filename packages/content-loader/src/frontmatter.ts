import { parse } from 'yaml';

export function splitFrontMatter(raw: string): { data: unknown; body: string } {
  const text = raw.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const m = /^---\n([\s\S]*?)\n---\n?/.exec(text);
  if (!m) throw new Error('Missing front-matter block (--- … ---) at the top of the file');
  return { data: parse(m[1]!) ?? {}, body: text.slice(m[0].length) };
}
