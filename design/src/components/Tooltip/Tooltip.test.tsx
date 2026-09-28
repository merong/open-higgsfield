import { render } from "@testing-library/react";
import { expect, it } from "vitest";

import { Tooltip } from "./Tooltip";

it("carries the label in data-tip and the alignment as a modifier", () => {
  const { container } = render(
    <Tooltip label="복제" align="end">
      <button type="button">c</button>
    </Tooltip>,
  );
  expect(container.firstChild).toHaveClass("ohf-tip", "ohf-tip--end");
  expect(container.firstChild).toHaveAttribute("data-tip", "복제");
});
