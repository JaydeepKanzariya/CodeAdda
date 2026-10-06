export interface CommandSpec {
  name: string;
  arity: number;
  flags: ("read" | "write" | "admin")[];
}

// Arity is checked before handlers so malformed commands cannot mutate state.
const exact = (name: string, arity: number): CommandSpec => ({
  name,
  arity,
  flags: ["read"],
});
const write = (name: string, arity: number): CommandSpec => ({
  name,
  arity,
  flags: ["write"],
});

export const COMMANDS: ReadonlyMap<string, CommandSpec> = new Map([
  ["GET", exact("GET", 2)],
  ["SET", write("SET", -3)],
  ["HSET", exact("HSET", -4)],
  ["PING", exact("PING", -1)],
  ["INCR", exact("INCR", 2)],
  ["INCRBY", exact("INCRBY", 3)],
  ["LSET", exact("LSET", 4)],
  ["LMOVE", exact("LMOVE", 5)],
  ["RPOPLPUSH", exact("RPOPLPUSH", 3)],
  ["ZADD", write("ZADD", -4)],
  ["ZRANGE", exact("ZRANGE", -4)],
  ["ZRANGEBYSCORE", exact("ZRANGEBYSCORE", -4)],
  ["ZREVRANGE", exact("ZREVRANGE", -4)],
  ["SINTERCARD", exact("SINTERCARD", -3)],
  ["SMISMEMBER", exact("SMISMEMBER", -3)],
  ["XGROUP", exact("XGROUP", -3)],
  ["XADD", write("XADD", -4)],
  ["XREAD", exact("XREAD", -4)],
  ["XREADGROUP", exact("XREADGROUP", -6)],
  ["XACK", exact("XACK", -4)],
  ["XPENDING", exact("XPENDING", -3)],
]);

export function arityError(name: string): string {
  return `ERR wrong number of arguments for '${name.toLowerCase()}' command`;
}

export function matchesArity(spec: CommandSpec, count: number): boolean {
  return spec.arity > 0 ? count === spec.arity : count >= -spec.arity;
}
