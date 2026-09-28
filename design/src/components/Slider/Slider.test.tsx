import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { Slider } from "./Slider";

it("is a range input whose fill follows the value", () => {
  const onChange = vi.fn();
  render(<Slider min={0} max={100} value={40} onChange={onChange} aria-label="어둡게" />);
  const el = screen.getByRole("slider", { name: "어둡게" });
  expect(el).toHaveClass("ohf-slider");
  expect(el.style.getPropertyValue("--fill")).toBe("40.0%");
  fireEvent.change(el, { target: { value: "75" } });
  expect(onChange).toHaveBeenCalledWith(75);
});
