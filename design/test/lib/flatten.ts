export interface Decl {
  ctx: string;
  prop: string;
  value: string;
}

const squash = (s: string) => s.replace(/\s+/g, " ").trim();

/* Removes block comments while leaving quoted strings intact: a "/*" inside a
   data: URL must not open a comment. */
export function stripComments(css: string): string {
  let out = "";
  let i = 0;
  while (i < css.length) {
    const ch = css[i]!;
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== ch) {
        if (css[j] === "\\") j++;
        j++;
      }
      out += css.slice(i, j + 1);
      i = j + 1;
    } else if (ch === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end < 0 ? css.length : end + 2;
    } else {
      out += ch;
      i++;
    }
  }
  return out;
}

/* Walks the braces once. Every "prop: value" becomes a triple whose context is
   the chain of enclosing selectors and at-rules, so the same declaration under
   two media queries stays two entries. Statements outside any block, such as
   @charset, are dropped. */
export function flatten(css: string): Decl[] {
  const out: Decl[] = [];
  const stack: string[] = [];
  let buf = "";
  const push = () => {
    const text = squash(buf);
    buf = "";
    if (!text || stack.length === 0) return;
    const colon = text.indexOf(":");
    if (colon < 0) return;
    out.push({
      ctx: stack.join(" > "),
      prop: text.slice(0, colon).trim(),
      value: text.slice(colon + 1).trim(),
    });
  };
  const src = stripComments(css);
  let i = 0;
  while (i < src.length) {
    const ch = src[i]!;
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < src.length && src[j] !== ch) {
        if (src[j] === "\\") j++;
        j++;
      }
      buf += src.slice(i, j + 1);
      i = j + 1;
    } else if (ch === "{") {
      stack.push(squash(buf));
      buf = "";
      i++;
    } else if (ch === "}") {
      push();
      stack.pop();
      i++;
    } else if (ch === ";") {
      push();
      i++;
    } else {
      buf += ch;
      i++;
    }
  }
  return out;
}

const VAR = /var\(\s*(--[\w-]+)\s*(?:,\s*((?:[^()]|\([^()]*\))*))?\)/g;

/* Substitutes var() with the value declared for that name anywhere in the same
   sheet (first declaration wins) until nothing changes. Names the sheet never
   declares — the ones JS sets inline, like --thumb-x — stay as written. */
export function resolveVars(decls: Decl[]): Decl[] {
  const table = new Map<string, string>();
  for (const d of decls) {
    if (d.prop.startsWith("--") && !table.has(d.prop)) table.set(d.prop, d.value);
  }
  const resolve = (value: string) => {
    let v = value;
    for (let n = 0; n < 20; n++) {
      const next = v.replace(VAR, (m, name: string) => table.get(name) ?? m);
      if (next === v) break;
      v = next;
    }
    return v;
  };
  return decls.map((d) => ({ ...d, value: resolve(d.value) }));
}

export function normalize(value: string): string {
  return squash(value)
    .replace(/\s*([,/()])\s*/g, "$1")
    .toLowerCase();
}
