import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Pill } from "./Pill";

it("shows label and value on the studio control pill", () => {
  render(<Pill label="장수" value="8" glyph={<svg data-testid="g" />} />);
  const el = screen.getByRole("button");
  expect(el).toHaveClass("ohf-ctl");
  expect(el.querySelector(".ohf-ctl-label")).toHaveTextContent("장수");
  expect(el.querySelector(".ohf-ctl-value")).toHaveTextContent("8");
  expect(screen.getByTestId("g").closest(".ohf-ctl-glyph")).not.toBeNull();
  expect(el).not.toHaveAttribute("aria-expanded");
});

it("reports an open panel", () => {
  render(<Pill value="최근 수정" expanded />);
  expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
});
