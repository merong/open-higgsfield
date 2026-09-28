import { cpSync, existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const dist = join(root, "dist");

for (const name of ["index.js", "index.d.ts", "ohf.css"]) {
  if (!existsSync(join(dist, name))) throw new Error(`dist/${name} is missing`);
}

/* Real SCSS ships from src/index.ts as of Task 3 onward, so an empty ohf.css
   can only mean the CSS import was dropped from the bundle — a regression,
   not a legitimate empty state to paper over. */
if (statSync(join(dist, "ohf.css")).size === 0) throw new Error("dist/ohf.css is empty");

/* The consuming app ships its own React; a second copy would break hooks. */
const js = readFileSync(join(dist, "index.js"), "utf8");
if (js.includes("react-dom")) throw new Error("dist/index.js bundles react-dom");

/* Declarations must not leak the "@/" alias — consumers cannot resolve it. */
function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}
for (const file of walk(dist).filter((f) => f.endsWith(".d.ts"))) {
  if (readFileSync(file, "utf8").includes('"@/')) throw new Error(`${file} references the @/ alias`);
}

/* tokens/index.d.ts imports the JSON by relative path; ship it next to it. */
const json = join(root, "src/tokens/tokens.json");
if (existsSync(json)) cpSync(json, join(dist, "tokens/tokens.json"));

console.log("dist ok");
