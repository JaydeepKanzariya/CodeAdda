export type Method = 'find' | 'findOne' | 'aggregate' | 'countDocuments' | 'distinct' | 'insertOne' | 'insertMany' | 'updateOne' | 'updateMany' | 'replaceOne' | 'deleteOne' | 'deleteMany';
export type ChainName = 'sort' | 'skip' | 'limit' | 'pretty' | 'toArray';
export interface MongoCall { collection: string; method: Method; args: unknown[]; chain: { name: ChainName; args: unknown[] }[] }

/** A syntax error; `position` is 1-based, like PostgreSQL's error positions. */
export class MongoParseError extends Error {
  constructor(message: string, readonly position: number) { super(message); this.name = 'MongoParseError'; }
}

const METHODS = new Set<string>(['find', 'findOne', 'aggregate', 'countDocuments', 'distinct', 'insertOne', 'insertMany', 'updateOne', 'updateMany', 'replaceOne', 'deleteOne', 'deleteMany']);
const CHAIN = new Set<string>(['sort', 'skip', 'limit', 'pretty', 'toArray']);
const IDENT = /[A-Za-z_$][\w$]*/y;
const NUMBER = /-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/y;
const PLAIN = 'Use plain values: "text", numbers, true, false, null, { objects }, [ arrays ] or /regex/.';

export function parseMongosh(src: string): MongoCall {
  return new Parser(src).statement();
}

class Parser {
  private i = 0;
  constructor(private readonly s: string) {}

  private fail(message: string, at = this.i): never { throw new MongoParseError(message, at + 1); }

  private ws(): void {
    for (;;) {
      while (this.i < this.s.length && /\s/.test(this.s[this.i]!)) this.i++;
      if (this.s.startsWith('//', this.i)) { const n = this.s.indexOf('\n', this.i); this.i = n === -1 ? this.s.length : n; continue; }
      if (this.s.startsWith('/*', this.i)) { const n = this.s.indexOf('*/', this.i + 2); if (n === -1) this.fail('Unclosed /* comment'); this.i = n + 2; continue; }
      return;
    }
  }
  private peek(): string | undefined { this.ws(); return this.s[this.i]; }
  private eat(ch: string): void { if (this.peek() !== ch) this.fail(this.i >= this.s.length ? `Expected "${ch}" but the query ended` : `Expected "${ch}"`); this.i++; }
  private match(re: RegExp): string | undefined { this.ws(); re.lastIndex = this.i; const m = re.exec(this.s); if (!m) return undefined; this.i = re.lastIndex; return m[0]; }
  private ident(what: string): { name: string; at: number } { const at = (this.ws(), this.i); const name = this.match(IDENT); if (!name) this.fail(`Expected ${what}`, at); return { name, at }; }

  statement(): MongoCall {
    const db = this.ident('db');
    if (db.name !== 'db') this.fail('Queries start with db, for example db.movies.find()', db.at);
    this.eat('.');
    const collection = this.ident('a collection name').name;
    this.eat('.');
    const m = this.ident('a method such as find');
    if (!METHODS.has(m.name)) this.fail(`"${m.name}" isn't supported in this lab. Try find, findOne, aggregate, countDocuments, distinct, insertOne, insertMany, updateOne, updateMany, replaceOne, deleteOne or deleteMany.`, m.at);
    const args = this.args();
    const chain: MongoCall['chain'] = [];
    while (this.peek() === '.') {
      this.i++;
      const c = this.ident('a cursor method such as sort');
      if (m.name !== 'find' || !CHAIN.has(c.name)) this.fail(`.${c.name}() can't be used here. After find() you can use .sort(), .skip(), .limit(), .pretty() or .toArray().`, c.at);
      chain.push({ name: c.name as ChainName, args: this.args() });
    }
    if (this.peek() === ';') this.i++;
    if (this.peek() !== undefined) this.fail('Run one statement at a time');
    return { collection, method: m.name as Method, args, chain };
  }

  private args(): unknown[] {
    this.eat('(');
    const out: unknown[] = [];
    if (this.peek() === ')') { this.i++; return out; }
    for (;;) {
      out.push(this.value());
      if (this.peek() === ',') { this.i++; if (this.peek() === ')') { this.i++; return out; } continue; }
      this.eat(')');
      return out;
    }
  }

  private value(): unknown {
    const c = this.peek();
    if (c === '{') return this.object();
    if (c === '[') return this.array();
    if (c === '"' || c === "'") return this.string();
    if (c === '/') return this.regex();
    if (c === '-' || (c !== undefined && /[\d.]/.test(c))) { const at = this.i; const n = this.match(NUMBER); if (n === undefined) this.fail('Expected a number', at); return Number(n); }
    const at = this.i;
    const word = this.match(IDENT);
    if (word === 'true') return true;
    if (word === 'false') return false;
    if (word === 'null') return null;
    if (word) this.fail(`"${word}" isn't supported here. ${PLAIN}`, at);
    if (c === undefined) this.fail('The query ended too early');
    this.fail(`Unexpected "${c}". ${PLAIN}`);
  }

  private object(): Record<string, unknown> {
    this.eat('{');
    const o: Record<string, unknown> = {};
    if (this.peek() === '}') { this.i++; return o; }
    for (;;) {
      const c = this.peek();
      const key = c === '"' || c === "'" ? this.string() : this.ident('a field name').name;
      this.eat(':');
      // defineProperty, not o[key] = …, so a "__proto__" key stays a plain field.
      Object.defineProperty(o, key, { value: this.value(), enumerable: true, writable: true, configurable: true });
      if (this.peek() === ',') { this.i++; if (this.peek() === '}') { this.i++; return o; } continue; }
      this.eat('}');
      return o;
    }
  }

  private array(): unknown[] {
    this.eat('[');
    const a: unknown[] = [];
    if (this.peek() === ']') { this.i++; return a; }
    for (;;) {
      a.push(this.value());
      if (this.peek() === ',') { this.i++; if (this.peek() === ']') { this.i++; return a; } continue; }
      this.eat(']');
      return a;
    }
  }

  private string(): string {
    const q = this.s[this.i]!;
    const start = this.i++;
    let out = '';
    while (this.i < this.s.length) {
      const ch = this.s[this.i++]!;
      if (ch === q) return out;
      if (ch === '\n') break;
      if (ch !== '\\') { out += ch; continue; }
      const e = this.s[this.i++];
      if (e === 'u') { const hex = this.s.slice(this.i, this.i + 4); if (!/^[0-9a-fA-F]{4}$/.test(hex)) this.fail('Bad \\u escape'); out += String.fromCharCode(parseInt(hex, 16)); this.i += 4; }
      else out += ({ n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', '0': '\0' } as Record<string, string>)[e ?? ''] ?? e ?? '';
    }
    this.fail('This text is missing its closing quote', start);
  }

  private regex(): RegExp {
    const start = this.i++;
    let body = '';
    let inClass = false;
    while (this.i < this.s.length) {
      const ch = this.s[this.i++]!;
      if (ch === '\\') { body += ch + (this.s[this.i++] ?? ''); continue; }
      if (ch === '[') inClass = true; else if (ch === ']') inClass = false;
      else if (ch === '/' && !inClass) {
        const flags = this.match(/[gimsuy]*/y) ?? '';
        try { return new RegExp(body, flags); } catch (e) { this.fail(`Invalid regular expression: ${(e as Error).message}`, start); }
      } else if (ch === '\n') break;
      body += ch;
    }
    this.fail('This /regex/ is missing its closing /', start);
  }
}
