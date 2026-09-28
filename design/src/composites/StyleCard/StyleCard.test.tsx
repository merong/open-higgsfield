import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { StyleCard } from "./StyleCard";

it("shows a preview, a name and a check when pressed", () => {
  const { container } = render(<StyleCard preview={<span data-testid="pv" />} name="기본 고딕" description="남색과 노랑" pressed />);
  expect(screen.getByRole("button", { pressed: true })).toHaveClass("ohf-scard");
  expect(screen.getByTestId("pv").closest(".ohf-scard-preview")).not.toBeNull();
  expect(container.querySelector(".ohf-scard-check")).not.toBeNull();
});
