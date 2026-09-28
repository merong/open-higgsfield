import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

/* Rewrites literals that equal a token to var(--token), property by property,
   inside the studio partials. Runs once but is idempotent: a value already
   written as var() matches nothing here. Spacing literals stay literal on
   purpose (spec 4.6), as do 7px/9px/12px concentric corrections. */
const root = fileURLToPath(new URL("..", import.meta.url));
const DIRS = ["src/styles/base", "src/styles/studio"];

const RADIUS = { "4px": "xs", "6px": "sm", "8px": "md", "10px": "ctl", "14px": "lg", "15px": "bar", "24px": "xl", "999px": "pill" };
const HEIGHT = { "28px": "xs", "32px": "sm", "36px": "md", "38px": "lg", "46px": "bar" };
const FS = { "10.5px": "2xs", "11.5px": "xs", "12.5px": "sm", "13px": "md", "14px": "base", "15px": "lg", "22px": "title" };
const FW = { 500: "medium", 550: "strong", 600: "bold", 620: "display" };
const LS = { "-0.005em": "tight", "-0.015em": "heading", "0.16em": "caps" };
const DUR = { "0.12s": "fast", "0.15s": "base", "0.2s": "slow", "0.34s": "slide" };

function tokenizeBlock(body) {
  /* A square control (width equal to its height) keeps both literals: a height
     token next to a literal width would read as two different decisions. */
  const widths = [...body.matchAll(/(?:^|\n)\s*width:\s*([\d.]+px);/g)].map((m) => m[1]);
  let out = body;
  out = out.replace(/(\n\s*)border-radius:\s*([\d.]+px);/g, (m, ws, v) => (RADIUS[v] ? `${ws}border-radius: var(--radius-${RADIUS[v]});` : m));
  out = out.replace(/(\n\s*)height:\s*([\d.]+px);/g, (m, ws, v) => (HEIGHT[v] && !widths.includes(v) ? `${ws}height: var(--h-${HEIGHT[v]});` : m));
  out = out.replace(/(\n\s*)font-size:\s*([\d.]+px);/g, (m, ws, v) => (FS[v] ? `${ws}font-size: var(--fs-${FS[v]});` : m));
  out = out.replace(/(\n\s*)font-weight:\s*(\d+);/g, (m, ws, v) => (FW[v] ? `${ws}font-weight: var(--fw-${FW[v]});` : m));
  out = out.replace(/(\n\s*)letter-spacing:\s*(-?[\d.]+em);/g, (m, ws, v) => (LS[v] ? `${ws}letter-spacing: var(--ls-${LS[v]});` : m));
  out = out.replace(/(\n\s*)(transition|animation)(:[^;]*;)/g, (m, ws, prop, rest) =>
    `${ws}${prop}${rest.replace(/(?<=\s)(0\.12s|0\.15s|0\.2s|0\.34s)(?=[\s,;])/g, (d) => `var(--dur-${DUR[d]})`)}`,
  );
  out = out.replace(/--ctl-r:\s*10px;/g, "--ctl-r: var(--radius-ctl);");
  return out;
}

function tokenize(src) {
  /* Innermost blocks only: a rule inside @media is matched by itself, and the
     @media block, which contains braces, is left alone. */
  return src.replace(/\{([^{}]*)\}/g, (m, body) => `{${tokenizeBlock(body)}}`);
}

let changed = 0;
for (const dir of DIRS) {
  for (const name of readdirSync(join(root, dir)).filter((n) => n.endsWith(".scss"))) {
    const file = join(root, dir, name);
    const before = readFileSync(file, "utf8");
    const after = tokenize(before);
    if (after !== before) {
      writeFileSync(file, after);
      changed++;
    }
  }
}
console.log(`tokenized ${changed} partials`);
