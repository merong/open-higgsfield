import { cp, access } from "node:fs/promises";
import { resolve } from "node:path";
const source = resolve("design/dist");
await access(resolve(source, "index.js"));
await cp(source, resolve("vendor/design/dist"), { recursive: true });
console.log(
  "Copied design/dist into vendor/design/dist. Run pnpm install --force to refresh the local package.",
);
