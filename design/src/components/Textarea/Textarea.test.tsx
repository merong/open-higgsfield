import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Textarea } from "./Textarea";

it("is a native textarea wearing the input face", () => {
  render(<Textarea aria-label="꼭 넣을 내용" rows={3} />);
  const el = screen.getByRole("textbox", { name: "꼭 넣을 내용" });
  expect(el.tagName).toBe("TEXTAREA");
  expect(el).toHaveClass("ohf-input", "ohf-input--area");
});
