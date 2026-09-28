import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as sass from "sass-embedded";

/* Deviation from the brief: `new URL("..", import.meta.url)` is the literal
   text, but Vite statically pattern-matches `new URL(relative, import.meta.url)`
   as its asset-URL syntax and rewrites it — including inside this plain Node
   script, once Vitest imports it through Vite's transform pipeline for
   tokens-sync.test.ts. That resolves "root" to a browser dev-server URL
   instead of this file's directory. path.dirname sidesteps the pattern match
   while producing the same value under plain `node scripts/export-tokens.mjs`. */
const root = join(dirname(fileURLToPath(import.meta.url)), "..") + "/";

/* Compiles _emit.scss on its own and reads the `.ohf { --x: y }` block back.
   The JSON is therefore derived from the same Sass output the stylesheet
   ships, never from a second parse of the maps. */
export function collectTokens() {
  const css = sass.compile(`${root}src/styles/tokens/_emit.scss`, { style: "expanded" }).css;
  const block = /\.ohf\s*\{([^}]*)\}/.exec(css);
  if (!block) throw new Error("_emit.scss produced no .ohf block");
  const tokens = {};
  for (const line of block[1].split(";")) {
    const m = /^\s*--([\w-]+)\s*:\s*([\s\S]+?)\s*$/.exec(line);
    if (m) tokens[m[1]] = m[2].replace(/\s+/g, " ");
  }
  return tokens;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const out = `${root}src/tokens/tokens.json`;
  writeFileSync(out, `${JSON.stringify(collectTokens(), null, 2)}\n`);
  console.log(`wrote ${out}`);
}
