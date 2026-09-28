import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { FormatCard } from "./FormatCard";

it("is a pressed toggle with icon, name and description", () => {
  render(<FormatCard icon={<svg />} name="카드뉴스" description="캐러셀" pressed />);
  expect(screen.getByRole("button", { pressed: true })).toHaveClass("ohf-fcard");
});

it("is disabled and tagged when coming soon", () => {
  render(<FormatCard icon={<svg />} name="릴스" description="세로 영상" soon="준비 중" />);
  const el = screen.getByRole("button");
  expect(el).toBeDisabled();
  expect(el).toHaveClass("ohf-fcard--soon");
  expect(screen.getByText("준비 중")).toHaveClass("ohf-tag");
});
