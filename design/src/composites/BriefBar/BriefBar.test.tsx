import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { BriefBar } from "./BriefBar";

it("shows the topic with its label and slots", () => {
  const { container } = render(<BriefBar label="주제" topic="여름철 자외선 차단제" pills={<span>8장</span>} action={<button type="button">다시</button>} />);
  expect(container.firstChild).toHaveClass("ohf-brief");
  expect(screen.getByText("주제")).toHaveClass("ohf-brief-label");
  expect(screen.getByText("여름철 자외선 차단제")).toHaveClass("ohf-brief-topic");
  expect(screen.getByRole("button", { name: "다시" })).toBeInTheDocument();
});
