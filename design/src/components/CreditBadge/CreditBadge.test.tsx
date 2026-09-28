import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { CreditBadge } from "./CreditBadge";

it("formats the amount with thousands separators and takes a unit", () => {
  const { container } = render(<CreditBadge amount={1240} unit="크레딧" />);
  expect(container.firstChild).toHaveClass("ohf-credit");
  expect(screen.getByText("1,240")).toHaveClass("ohf-credit-amount");
  expect(screen.getByText("크레딧")).toHaveClass("ohf-credit-unit");
});
