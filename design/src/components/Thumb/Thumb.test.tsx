import { render } from "@testing-library/react";
import { expect, it } from "vitest";

import { Thumb } from "./Thumb";

it("renders each of the five states as a modifier", () => {
  for (const state of ["image", "pending", "failed", "empty", "flat"] as const) {
    const { container, unmount } = render(<Thumb state={state} src="/a.png" size={56} />);
    expect(container.firstChild).toHaveClass("ohf-frame", `ohf-frame--${state}`);
    unmount();
  }
});

it("shows the picture only in the image state and sizes itself by width and ratio", () => {
  const { container } = render(<Thumb state="image" src="/a.png" alt="표지" size={80} ratio="1:1" />);
  const el = container.firstChild as HTMLElement;
  expect(el.querySelector("img")).toHaveAttribute("alt", "표지");
  expect(el.style.width).toBe("80px");
  expect(el.style.aspectRatio).toBe("1 / 1");
});
