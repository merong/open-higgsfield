import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Input } from "./Input";

it("is a native input with the studio class and an invalid state", () => {
  render(<Input aria-label="대상 독자" invalid />);
  const el = screen.getByRole("textbox", { name: "대상 독자" });
  expect(el).toHaveClass("ohf-input");
  expect(el).toHaveAttribute("aria-invalid", "true");
});
