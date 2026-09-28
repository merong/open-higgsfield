import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { CanvasPanel } from "./CanvasPanel";

it("pages through slides and hosts the stage and its rows", () => {
  const onNext = vi.fn();
  render(
    <CanvasPanel
      mode={{ items: [{ id: "slide", label: "슬라이드" }, { id: "phone", label: "휴대폰" }], value: "slide", onChange: () => {}, "aria-label": "보기" }}
      index={1}
      total={8}
      onPrev={() => {}}
      onNext={onNext}
      prevLabel="이전 슬라이드"
      nextLabel="다음 슬라이드"
      stage={<div data-testid="stage" />}
      templates={{ label: "템플릿", chips: <button type="button">표지</button> }}
      options={{ label: "옵션", pills: <span>위치</span> }}
      actions={<button type="button">PNG</button>}
      hint="힌트"
    />,
  );
  expect(screen.getByRole("complementary")).toHaveClass("ohf-canvas");
  expect(screen.getByRole("button", { name: "이전 슬라이드" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "다음 슬라이드" }));
  expect(onNext).toHaveBeenCalledTimes(1);
  expect(screen.getByText("1 / 8")).toHaveClass("ohf-canvas-pager");
  expect(screen.getByTestId("stage").closest(".ohf-canvas-stage")).not.toBeNull();
  expect(screen.getByText("힌트")).toHaveClass("ohf-canvas-hint");
});
