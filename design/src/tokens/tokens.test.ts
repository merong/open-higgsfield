import { describe, expect, it } from "vitest";

import { cssVar, tokens } from "./index";

describe("tokens", () => {
  it("wraps a token name as a custom property reference", () => {
    expect(cssVar("radius-ctl")).toBe("var(--radius-ctl)");
  });

  it("is frozen", () => {
    expect(Object.isFrozen(tokens)).toBe(true);
  });
});
