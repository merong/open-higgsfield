import raw from "./tokens.json";

export type Token = keyof typeof raw;

/* Frozen so a consumer cannot mutate the shared table by accident. */
export const tokens: Readonly<Record<Token, string>> = Object.freeze({ ...raw });

export function cssVar(name: Token): string {
  return `var(--${name})`;
}
