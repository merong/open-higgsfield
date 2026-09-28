import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Spinner } from "./Spinner";

it("is decorative unless given a label", () => {
  const { container } = render(<Spinner />);
  expect(container.firstChild).toHaveClass("ohf-spinner");
  expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
});

it("announces itself when labelled", () => {
  render(<Spinner label="생성 중" />);
  expect(screen.getByRole("status", { name: "생성 중" })).toBeInTheDocument();
});
