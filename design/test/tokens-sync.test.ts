import { describe, expect, it } from "vitest";

import { collectTokens } from "../scripts/export-tokens.mjs";
import onDisk from "../src/tokens/tokens.json";

const LEGACY = [
  "bg",
  "rail",
  "s1",
  "s2",
  "s3",
  "s4",
  "line",
  "line-2",
  "tx",
  "tx2",
  "tx3",
  "tx4",
  "tx-off",
  "accent",
  "accent-strong",
  "accent-ink",
  "accent-08",
  "accent-14",
  "accent-32",
  "plate",
  "plate-ink",
  "shadow-1",
  "shadow-2",
  "shadow-3",
  "glint",
  "ease",
  "ease-slide",
  "font-ui",
  "danger",
  "danger-bg",
  "danger-line",
];
const ADDED = [
  ...["xs", "sm", "md", "ctl", "lg", "bar", "xl", "pill"].map(
    (k) => `radius-${k}`,
  ),
  ...["xs", "sm", "md", "lg", "bar"].map((k) => `h-${k}`),
  ...["2xs", "xs", "sm", "md", "base", "lg", "title"].map((k) => `fs-${k}`),
  ...["medium", "strong", "bold", "display"].map((k) => `fw-${k}`),
  ...["tight", "heading", "caps"].map((k) => `ls-${k}`),
  ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map((k) => `sp-${k}`),
  ...["fast", "base", "slow", "slide"].map((k) => `dur-${k}`),
];

describe("tokens.json", () => {
  it("is what export-tokens.mjs produces from the SCSS maps", () => {
    expect(onDisk).toEqual(collectTokens());
  });

  it("declares the 31 legacy tokens and the 40 added ones, in that order", () => {
    expect(Object.keys(onDisk).slice(0, 71)).toEqual([...LEGACY, ...ADDED]);
    expect(onDisk["surface-panel"]).toBe("var(--s1)");
    expect(onDisk["focus-ring"]).toBe("var(--accent)");
  });

  it("keeps the legacy values byte-for-byte", () => {
    expect(onDisk.bg).toBe("#0a0a0b");
    expect(onDisk.accent).toBe("#d1fe17");
    expect(onDisk.line).toBe("rgba(255, 255, 255, 0.06)");
    expect(onDisk["shadow-2"]).toBe(
      "0 4px 12px rgba(0, 0, 0, 0.3), 0 16px 40px rgba(0, 0, 0, 0.35)",
    );
    expect(onDisk["font-ui"]).toBe(
      "var(--font-ohf-inter), ui-sans-serif, system-ui, sans-serif",
    );
    expect(onDisk.ease).toBe("cubic-bezier(0.2, 0, 0, 1)");
  });

  it("uses the agreed values for the added tokens", () => {
    expect(onDisk["radius-ctl"]).toBe("10px");
    expect(onDisk["radius-pill"]).toBe("999px");
    expect(onDisk["h-bar"]).toBe("46px");
    expect(onDisk["fs-sm"]).toBe("12.5px");
    expect(onDisk["fw-display"]).toBe("620");
    expect(onDisk["ls-caps"]).toBe("0.16em");
    expect(onDisk["sp-8"]).toBe("32px");
    expect(onDisk["dur-slide"]).toBe("0.34s");
  });
});
