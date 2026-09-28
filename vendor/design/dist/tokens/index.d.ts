import { default as raw } from './tokens.json';
export type Token = keyof typeof raw;
export declare const tokens: Readonly<Record<Token, string>>;
export declare function cssVar(name: Token): string;
