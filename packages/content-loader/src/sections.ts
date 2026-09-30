const FENCE = /^\s*(```|~~~)/;
const HEADING = /^## (.+?)\s*$/;

export function splitSections(body: string): { intro: string; sections: Record<string, string> } {
  const buckets = new Map<string, string[]>();
  const intro: string[] = [];
  let current = intro;
  let inFence = false;
  for (const line of body.split('\n')) {
    if (FENCE.test(line)) inFence = !inFence;
    const h = inFence ? null : HEADING.exec(line);
    if (h) {
      current = [];
      buckets.set(h[1]!.toLowerCase(), current);
      continue;
    }
    current.push(line);
  }
  const sections: Record<string, string> = {};
  for (const [k, lines] of buckets) sections[k] = lines.join('\n').trim();
  return { intro: intro.join('\n').trim(), sections };
}

export function firstCodeBlock(md: string): string | undefined {
  const m = /(```|~~~)[^\n]*\n([\s\S]*?)\n\1/.exec(md);
  return m ? m[2]!.trim() : undefined;
}

export function parseHints(md: string): string[] {
  const text = md.trim();
  if (!text) return [];
  if (!/^[-*]\s+/.test(text)) return [text];
  return text
    .split(/^[-*]\s+/m)
    .map((h) => h.replace(/\s+$/, ''))
    .filter((h) => h.trim().length > 0);
}
