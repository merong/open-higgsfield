import { describe, expect, it } from "vitest";

import { contrast } from "../showcase/lib/contrast";
import tokens from "../src/tokens/tokens.json";

describe("contrast", () => {
  it("computes WCAG contrast for hex colours and refuses anything else", () => {
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 0);
    expect(contrast("rgba(0,0,0,0.5)", "#000000")).toBeNull();
  });

  /* The studio's own floor: small metadata type (tx4) holds 4.5:1 on the rail. */
  it("keeps the palette's body-text floor", () => {
    expect(contrast(tokens.tx4, tokens.rail)!).toBeGreaterThanOrEqual(4.5);
    expect(contrast(tokens.tx, tokens.bg)!).toBeGreaterThanOrEqual(7);
    expect(contrast(tokens["accent-ink"], tokens.accent)!).toBeGreaterThanOrEqual(7);
  });
});
