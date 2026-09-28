import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Chip } from "./Chip";

it("is a toggle when pressed is given", () => {
  const { rerender } = render(<Chip pressed>전체</Chip>);
  expect(screen.getByRole("button", { name: "전체", pressed: true })).toHaveClass("ohf-chip");
  rerender(<Chip pressed={false}>전체</Chip>);
  expect(screen.getByRole("button", { pressed: false })).toBeInTheDocument();
});

it("is a plain button without pressed", () => {
  render(<Chip>PNG</Chip>);
  expect(screen.getByRole("button")).not.toHaveAttribute("aria-pressed");
});

it("draws a dot or a ratio box before the label", () => {
  const { container, rerender } = render(<Chip dot>생성 중</Chip>);
  expect(container.querySelector(".ohf-chip-dot")).not.toBeNull();
  rerender(<Chip ratio="4:5">피드</Chip>);
  const box = container.querySelector<HTMLElement>(".ohf-chip-ratio");
  expect(box?.style.width).toBe("11px");
  expect(box?.style.height).toBe("14px");
});
