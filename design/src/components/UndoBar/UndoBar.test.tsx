import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { UndoBar } from "./UndoBar";

it("drains over the given window and offers the undo", () => {
  const onAction = vi.fn();
  const { container } = render(<UndoBar text="슬라이드 5를 지웠습니다" actionLabel="되돌리기" onAction={onAction} durationMs={6000} />);
  expect(container.firstChild).toHaveClass("ohf-undo");
  expect(container.querySelector<HTMLElement>(".ohf-undo-drain")?.style.animationDuration).toBe("6000ms");
  fireEvent.click(screen.getByRole("button", { name: "되돌리기" }));
  expect(onAction).toHaveBeenCalledTimes(1);
});
