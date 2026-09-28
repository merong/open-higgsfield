import { describe, expect, it } from "vitest";

import { flatten, normalize, resolveVars, stripComments } from "./flatten";

describe("stripComments", () => {
  it("removes block comments but not comment-like text inside strings", () => {
    const css = `a { content: "/* keep */"; /* drop */ color: red; }`;
    expect(stripComments(css)).toBe(`a { content: "/* keep */";  color: red; }`);
  });
});

describe("flatten", () => {
  it("keeps declarations in order with their selector as context", () => {
    expect(flatten(`.a { color: red; margin: 0 }\n.b { color: blue; }`)).toEqual([
      { ctx: ".a", prop: "color", value: "red" },
      { ctx: ".a", prop: "margin", value: "0" },
      { ctx: ".b", prop: "color", value: "blue" },
    ]);
  });

  it("nests at-rules into the context", () => {
    expect(flatten(`@media (max-width: 900px) { .a { gap: 4px; } }`)).toEqual([
      { ctx: "@media (max-width: 900px) > .a", prop: "gap", value: "4px" },
    ]);
  });

  it("drops statements outside any block", () => {
    expect(flatten(`@charset "UTF-8"; .a { x: 1; }`)).toEqual([{ ctx: ".a", prop: "x", value: "1" }]);
  });

  it("does not split on braces or semicolons inside strings", () => {
    const css = `.a { background: url("data:image/svg+xml,%3Csvg%3E{;}%3C/svg%3E"); }`;
    expect(flatten(css)).toEqual([
      { ctx: ".a", prop: "background", value: `url("data:image/svg+xml,%3Csvg%3E{;}%3C/svg%3E")` },
    ]);
  });
});

describe("resolveVars", () => {
  it("substitutes var() from custom properties declared anywhere in the sheet, transitively", () => {
    const decls = flatten(`.ohf { --radius-ctl: 10px; } .c { --ctl-r: var(--radius-ctl); } .d { border-radius: var(--ctl-r); }`);
    const resolved = resolveVars(decls);
    expect(resolved.at(-1)?.value).toBe("10px");
    expect(resolved[1]?.value).toBe("10px");
  });

  it("leaves names the sheet never declares alone, fallback included", () => {
    const [d] = resolveVars(flatten(`.a { left: var(--ohf-pop-x, calc(100% + 10px)); }`));
    expect(d?.value).toBe("var(--ohf-pop-x, calc(100% + 10px))");
  });
});

describe("normalize", () => {
  it("ignores whitespace around separators and letter case", () => {
    expect(normalize("rgba(255, 255, 255, 0.06)")).toBe("rgba(255,255,255,0.06)");
    expect(normalize("4 / 3")).toBe("4/3");
    expect(normalize("#EDEFEF")).toBe("#edefef");
  });
});
