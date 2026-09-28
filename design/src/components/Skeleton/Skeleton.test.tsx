import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Skeleton } from "./Skeleton";

it("is a status plate with a label and a clock", () => {
  render(<Skeleton label="생성 중" clock="0:42" ratio="4:5" />);
  const el = screen.getByRole("status");
  expect(el).toHaveClass("ohf-skeleton");
  expect(el.style.aspectRatio).toBe("4 / 5");
  expect(screen.getByText("생성 중")).toHaveClass("ohf-skeleton-label");
  expect(screen.getByText("0:42")).toHaveClass("ohf-skeleton-clock");
});
