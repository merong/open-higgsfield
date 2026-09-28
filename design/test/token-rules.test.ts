import { readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";
import * as sass from "sass-embedded";

import tokens from "../src/tokens/tokens.json";

/* Deviation from the brief: `new URL("..", import.meta.url)` is the literal
   text, but Vitest statically pattern-matches `new URL(relative, import.meta.url)`
   and rewrites it into an asset URL, breaking fileURLToPath (same issue noted
   in test/parity.test.ts from Task 3). dirname(fileURLToPath(...)) sidesteps
   the pattern match while resolving to the same path. */
const root = dirname(dirname(fileURLToPath(import.meta.url)));
const norm = (s: string) => s.replace(/\s+/g, " ").trim().toLowerCase();

function scssFiles(dir: string): string[] {
  const abs = join(root, dir);
  try {
    statSync(abs);
  } catch {
    return [];
  }
  return readdirSync(abs).flatMap((name) => {
    const path = join(abs, name);
    return statSync(path).isDirectory()
      ? scssFiles(join(dir, name))
      : path.endsWith(".scss")
        ? [path]
        : [];
  });
}

const byPrefix = (prefix: string) =>
  Object.entries(tokens)
    .filter(([k]) => k.startsWith(prefix))
    .map(([, v]) => norm(v));

const RULES: Record<string, string[]> = {
  "border-radius": byPrefix("radius-"),
  height: byPrefix("h-"),
  "font-size": byPrefix("fs-"),
  "font-weight": byPrefix("fw-"),
  "letter-spacing": byPrefix("ls-"),
};
const DURATIONS = byPrefix("dur-");
const COLORS = Object.entries(tokens)
  .filter(([, v]) => /^(#|rgba?\()/.test(v))
  .map(([, v]) => norm(v));
const SHADOWS = [...byPrefix("shadow-"), norm(tokens.glint)];

interface Violation {
  file: string;
  line: number;
  text: string;
}

function declarations(file: string) {
  return sass
    .compile(file, {
      style: "expanded",
      logger: sass.Logger.silent,
      importers: [
        {
          findFileUrl(url) {
            return url.startsWith("@/")
              ? pathToFileURL(join(root, "src", url.slice(2)))
              : null;
          },
        },
      ],
    })
    .css.split("\n")
    .map((text, i) => ({
      text,
      line: i + 1,
      m: /^\s*([a-z-]+)\s*:\s*([^;{]+);?\s*$/.exec(text),
    }))
    .filter((d) => d.m && !d.text.trim().startsWith("//"))
    .map((d) => ({ line: d.line, prop: d.m![1]!, value: norm(d.m![2]!) }));
}

/* Component SCSS may only reach a token through var(); the literal value of a
   token in a property is the drift this test exists to stop. */
function strictViolations(file: string): Violation[] {
  const out: Violation[] = [];
  for (const d of declarations(file)) {
    const rel = relative(root, file);
    if (RULES[d.prop]?.includes(d.value))
      out.push({ file: rel, line: d.line, text: `${d.prop}: ${d.value}` });
    if (
      /^(transition|animation)(-duration)?$/.test(d.prop) &&
      DURATIONS.some((t) =>
        new RegExp(`(^|[\\s,])${t.replace(".", "\\.")}([\\s,]|$)`).test(
          d.value,
        ),
      )
    ) {
      out.push({ file: rel, line: d.line, text: `${d.prop}: ${d.value}` });
    }
    if ([...COLORS, ...SHADOWS].some((t) => d.value.includes(t)))
      out.push({ file: rel, line: d.line, text: `${d.prop}: ${d.value}` });
  }
  return out;
}

/* Slides are the customer's content: they must not borrow the app palette,
   and the only custom properties they may read are their own --sl-* ones. */
function slideViolations(file: string): Violation[] {
  const out: Violation[] = [];
  const rel = relative(root, file);
  for (const d of declarations(file)) {
    if ([...COLORS, ...SHADOWS].some((t) => d.value.includes(t)))
      out.push({ file: rel, line: d.line, text: `${d.prop}: ${d.value}` });
    for (const m of d.value.matchAll(/var\(--([\w-]+)/g)) {
      if (!m[1]!.startsWith("sl-"))
        out.push({
          file: rel,
          line: d.line,
          text: `var(--${m[1]}) is an app token`,
        });
    }
  }
  return out;
}

/* Skipped, not passed, while a directory is still empty: a green run must
   never come from checking nothing. */
const strictFiles = [
  ...scssFiles("src/components"),
  ...scssFiles("src/composites"),
];
const slideFiles = scssFiles("src/slides");

describe("token rules", () => {
  it.skipIf(strictFiles.length === 0)(
    "components and composites use tokens through var(), never their literal values",
    () => {
      expect(strictFiles.flatMap(strictViolations)).toEqual([]);
    },
  );

  it.skipIf(slideFiles.length === 0)(
    "slides reference only --sl-* custom properties and no app colours",
    () => {
      expect(slideFiles.flatMap(slideViolations)).toEqual([]);
    },
  );

  it("recognises a literal token value", () => {
    expect(RULES["border-radius"]).toContain("10px");
    expect(COLORS).toContain("#d1fe17");
    expect(DURATIONS).toContain("0.15s");
  });
});
