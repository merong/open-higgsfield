import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { IconButton } from "./IconButton";

it("requires a name and renders size and ghost as modifiers", () => {
  render(<IconButton icon={<svg />} aria-label="닫기" size={28} ghost />);
  const el = screen.getByRole("button", { name: "닫기" });
  expect(el).toHaveClass("ohf-icon-btn", "ohf-icon-btn--28", "ohf-icon-btn--ghost");
  expect(el).toHaveAttribute("type", "button");
});

it("defaults to 30px", () => {
  render(<IconButton icon={<svg />} aria-label="복제" />);
  expect(screen.getByRole("button")).toHaveClass("ohf-icon-btn--30");
});
