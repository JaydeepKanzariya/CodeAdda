export { COMMANDS } from "../registry";
export const SET_COMMANDS = [
  "SADD",
  "SREM",
  "SMEMBERS",
  "SISMEMBER",
  "SMISMEMBER",
  "SCARD",
  "SINTER",
  "SUNION",
  "SDIFF",
  "SINTERCARD",
  "SINTERSTORE",
  "SUNIONSTORE",
  "SDIFFSTORE",
  "SMOVE",
  "SPOP",
  "SRANDMEMBER",
] as const;
