export interface Command {
  line: number;
  args: string[];
}
export class RedisSyntaxError extends Error {
  constructor(
    message: string,
    readonly line: number,
    readonly column: number,
  ) {
    super(`${message} (line ${line}, column ${column})`);
  }
}
const ESC: Record<string, string> = {
  n: "\n",
  r: "\r",
  t: "\t",
  b: "\b",
  a: "\x07",
  '"': '"',
  "\\": "\\",
};
export function tokenize(script: string): Command[] {
  const out: Command[] = [];
  script.split(/\r?\n/).forEach((text, i) => {
    const line = i + 1;
    if (/^\s*(#|$)/.test(text)) return;
    const args: string[] = [];
    let p = 0;
    while (p < text.length) {
      while (p < text.length && /\s/.test(text[p]!)) p++;
      if (p >= text.length) break;
      const start = p;
      let arg = "";
      const q = text[p];
      if (q === '"' || q === "'") {
        p++;
        let closed = false;
        while (p < text.length) {
          const c = text[p++]!;
          if (c === q) {
            closed = true;
            break;
          }
          if (c === "\\" && q === '"') {
            const e = text[p++] ?? "";
            if (e === "x" && /^[0-9a-fA-F]{2}$/.test(text.slice(p, p + 2))) {
              arg += String.fromCharCode(parseInt(text.slice(p, p + 2), 16));
              p += 2;
            } else arg += ESC[e] ?? e;
          } else if (c === "\\" && q === "'" && text[p] === "'") {
            arg += "'";
            p++;
          } else arg += c;
        }
        if (!closed)
          throw new RedisSyntaxError("Unbalanced quotes", line, start + 1);
        if (p < text.length && !/\s/.test(text[p]!))
          throw new RedisSyntaxError(
            "A closing quote must be followed by a space",
            line,
            p + 1,
          );
      } else while (p < text.length && !/\s/.test(text[p]!)) arg += text[p++];
      args.push(arg);
    }
    out.push({ line, args });
  });
  return out;
}
