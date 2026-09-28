import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { Stepper } from "./Stepper";

it("steps within bounds and disables the edge buttons", () => {
  const onChange = vi.fn();
  render(<Stepper value={10} min={4} max={10} onChange={onChange} suffix="장" decrementLabel="한 장 줄이기" incrementLabel="한 장 늘리기" />);
  expect(screen.getByRole("button", { name: "한 장 늘리기" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "한 장 줄이기" }));
  expect(onChange).toHaveBeenCalledWith(9);
  expect(screen.getByText("10")).toHaveClass("ohf-batch-value");
  expect(screen.getByText("장")).toHaveClass("ohf-batch-max");
});
