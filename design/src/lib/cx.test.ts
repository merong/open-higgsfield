import { expect, it } from "vitest";

import { cx } from "./cx";

it("joins truthy class names with one space", () => {
  expect(cx("a", false, "b", null, undefined, "c")).toBe("a b c");
  expect(cx()).toBe("");
});
