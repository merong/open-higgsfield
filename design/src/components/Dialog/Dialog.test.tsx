import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { Dialog } from "./Dialog";

it("opens as a modal dialog with a title and a close button", () => {
  const onClose = vi.fn();
  render(
    <Dialog open title="내보내기" onClose={onClose} closeLabel="닫기" width={600}>
      <p>8장</p>
    </Dialog>,
  );
  const dialog = screen.getByRole("dialog", { name: "내보내기" });
  expect(dialog).toHaveAttribute("aria-modal", "true");
  expect(dialog.querySelector<HTMLElement>(".ohf-dialog-panel")?.style.width).toBe("600px");
  fireEvent.click(screen.getByRole("button", { name: "닫기" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

it("renders inline as a plain dialog box when asked", () => {
  const { container } = render(
    <Dialog open inline title="크레딧 부족" onClose={() => {}} closeLabel="닫기">
      <p>12</p>
    </Dialog>,
  );
  expect(container.querySelector("dialog")).toBeNull();
  expect(screen.getByRole("dialog", { name: "크레딧 부족" })).toHaveClass("ohf-dialog-panel");
});
