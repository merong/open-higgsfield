import { render } from "@testing-library/react";
import { expect, it } from "vitest";

import { Tag } from "./Tag";

it("renders tones as modifiers", () => {
  const { container, rerender } = render(<Tag>카드뉴스</Tag>);
  expect(container.firstChild).toHaveClass("ohf-tag");
  expect(container.firstChild).not.toHaveClass("ohf-tag--accent");
  rerender(<Tag tone="accent">기본값</Tag>);
  expect(container.firstChild).toHaveClass("ohf-tag--accent");
});
