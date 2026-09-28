import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { OptionList } from "./OptionList";

const options = [
  { value: "auto", label: "Auto" },
  { value: "4:5", label: "4:5" },
];

it("lists options as pressed buttons and reports a pick", () => {
  const onChange = vi.fn();
  render(<OptionList options={options} value="4:5" onChange={onChange} ratio />);
  expect(screen.getByRole("button", { name: "4:5", pressed: true })).toHaveClass("ohf-opt");
  fireEvent.click(screen.getByRole("button", { name: "Auto" }));
  expect(onChange).toHaveBeenCalledWith("auto");
  expect(document.querySelector(".ohf-opt-box--auto")).not.toBeNull();
});
