import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { Switch } from "./Switch";

it("is a switch that flips on click", () => {
  const onChange = vi.fn();
  render(<Switch checked={false} onChange={onChange} aria-label="쪽 번호 표시" />);
  const el = screen.getByRole("switch", { name: "쪽 번호 표시" });
  expect(el).toHaveAttribute("aria-checked", "false");
  fireEvent.click(el);
  expect(onChange).toHaveBeenCalledWith(true);
});
