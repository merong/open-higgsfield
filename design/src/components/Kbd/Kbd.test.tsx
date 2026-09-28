import { render } from "@testing-library/react";
import { expect, it } from "vitest";

import { Kbd } from "./Kbd";

it("renders a kbd element with the studio class", () => {
  const { container } = render(<Kbd>⌘↵</Kbd>);
  expect(container.querySelector("kbd")).toHaveClass("ohf-kbd");
  expect(container.querySelector("kbd")).toHaveTextContent("⌘↵");
});
