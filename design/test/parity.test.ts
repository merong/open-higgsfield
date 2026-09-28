import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import * as sass from "sass-embedded";
import { describe, expect, it } from "vitest";

import { flatten, normalize, resolveVars, type Decl } from "./lib/flatten";

/* Deviation from the brief: `new URL("../..", import.meta.url)` is the literal
   text, but Vitest statically pattern-matches `new URL(relative, import.meta.url)`
   and rewrites it into an asset URL, which then fails `fileURLToPath` with
   "The URL must be of scheme file" (same issue as scripts/export-tokens.mjs in
   Task 2). path.dirname sidesteps the pattern match while resolving to the
   same path. */
const here = dirname(fileURLToPath(import.meta.url));
const ORIGINAL = join(here, "../../src/openhiggsfield/openhiggsfield.css");
const ENTRY = join(here, "../src/styles/index.scss");

const isCustom = (d: Decl) => d.prop.startsWith("--");
const line = (d: Decl) => `${d.ctx} | ${d.prop}: ${normalize(d.value)}`;

/* Both sheets go through Dart Sass, so its own formatting (number and colour
   serialisation, list spacing) cancels out and only real differences remain. */
function sheets() {
  const ours = sass.compile(ENTRY, { style: "expanded", logger: sass.Logger.silent }).css;
  const theirs = sass.compileString(readFileSync(ORIGINAL, "utf8"), {
    syntax: "css",
    style: "expanded",
    logger: sass.Logger.silent,
  }).css;
  return { ours: resolveVars(flatten(ours)), theirs: resolveVars(flatten(theirs)) };
}

function firstMismatch(a: string[], b: string[]): string | null {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (a[i] === b[i]) continue;
    const ctx = (list: string[]) => list.slice(Math.max(0, i - 2), i + 3).join("\n    ");
    return `first difference at #${i} (ours ${a.length} vs original ${b.length} declarations)\n  ours:\n    ${ctx(a)}\n  original:\n    ${ctx(b)}`;
  }
  return null;
}

describe("parity with openhiggsfield.css", () => {
  it("has the original stylesheet to compare against", () => {
    expect(existsSync(ORIGINAL), `missing ${ORIGINAL}`).toBe(true);
  });

  it("emits every declaration of the original, in order, with the same resolved value", () => {
    const { ours, theirs } = sheets();
    const diff = firstMismatch(ours.filter((d) => !isCustom(d)).map(line), theirs.filter((d) => !isCustom(d)).map(line));
    expect(diff, diff ?? "").toBeNull();
  });

  it("keeps every custom property the original declares, resolving to the same value", () => {
    const { ours, theirs } = sheets();
    const mine = ours.filter(isCustom);
    for (const d of theirs.filter(isCustom)) {
      const match = mine.find((m) => m.ctx === d.ctx && m.prop === d.prop);
      expect(match, `${d.ctx} { ${d.prop} } is missing`).toBeDefined();
      expect(normalize(match!.value), `${d.ctx} { ${d.prop} }`).toBe(normalize(d.value));
    }
  });
});
