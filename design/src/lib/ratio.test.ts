import { expect, it } from "vitest";

import { ratioBox, ratioToCss } from "./ratio";

it("draws a ratio as a box that fits 14px on its long side", () => {
  expect(ratioBox("16:9")).toEqual({ width: 14, height: 8 });
  expect(ratioBox("1:1")).toEqual({ width: 14, height: 14 });
  expect(ratioBox("auto")).toBeNull();
});

it("turns a ratio into an aspect-ratio value", () => {
  expect(ratioToCss("4:5", "1 / 1")).toBe("4 / 5");
  expect(ratioToCss(undefined, "1 / 1")).toBe("1 / 1");
});
