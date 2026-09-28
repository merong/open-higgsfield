import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Avatar } from "./Avatar";

it("shows initials or a picture at a fixed size", () => {
  const { container, rerender } = render(<Avatar initials="BK" size={44} />);
  expect(container.firstChild).toHaveClass("ohf-avatar", "ohf-avatar--44");
  expect(screen.getByText("BK")).toBeInTheDocument();
  rerender(<Avatar src="/me.png" alt="내 사진" />);
  expect(screen.getByRole("img", { name: "내 사진" })).toHaveClass("ohf-avatar-img");
});
