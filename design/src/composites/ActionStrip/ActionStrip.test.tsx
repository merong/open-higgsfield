import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { ActionStrip } from "./ActionStrip";

it("puts status left, actions right and a notice above", () => {
  const { container } = render(
    <ActionStrip status="7장 생성 대기" actions={<button type="button">생성</button>} notice={<div role="alert">오류</div>} />,
  );
  expect(container.firstChild).toHaveClass("ohf-astrip");
  expect(screen.getByText("7장 생성 대기").closest(".ohf-astrip-status")).not.toBeNull();
  expect(screen.getByRole("alert").closest(".ohf-astrip-notice")).not.toBeNull();
  expect(screen.getByRole("button", { name: "생성" })).toBeInTheDocument();
});
