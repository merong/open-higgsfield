import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { StoryboardRow } from "./StoryboardRow";

const base = { index: 3, thumb: { state: "image" as const, src: "/a.png" }, tag: "목록", title: "상황별 추천 지수", sub: "출퇴근 · 야외" };

describe("StoryboardRow", () => {
  it("lays out number, thumb, text, prompt and actions", () => {
    const { container } = render(
      <StoryboardRow {...base} prompt="도심 출근길" actions={<button type="button">복제</button>} />,
    );
    const row = container.firstChild as HTMLElement;
    expect(row).toHaveClass("ohf-sb-row");
    expect(row.querySelector(".ohf-sb-num")).toHaveTextContent("3");
    expect(row.querySelector(".ohf-frame--image")).not.toBeNull();
    expect(row.querySelector(".ohf-sb-title")).toHaveTextContent("상황별 추천 지수");
    expect(row.querySelector(".ohf-sb-prompt-text")).toHaveTextContent("도심 출근길");
    expect(screen.getByRole("button", { name: "복제" })).toBeInTheDocument();
  });

  it("selects through a real button, reachable by keyboard", () => {
    const onSelect = vi.fn();
    render(<StoryboardRow {...base} onSelect={onSelect} />);
    const select = screen.getByRole("button", { name: base.title });
    expect(select).toHaveClass("ohf-sb-select");
    fireEvent.click(select);
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("does not select when a nested action is clicked", () => {
    const onSelect = vi.fn();
    render(<StoryboardRow {...base} onSelect={onSelect} actions={<button type="button">복제</button>} />);
    fireEvent.click(screen.getByRole("button", { name: "복제" }));
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("renders no select button without onSelect, or while editing", () => {
    const onSelect = vi.fn();
    const { rerender } = render(<StoryboardRow {...base} />);
    expect(screen.queryByRole("button", { name: base.title })).toBeNull();
    rerender(<StoryboardRow {...base} onSelect={onSelect} editing />);
    expect(screen.queryByRole("button", { name: base.title })).toBeNull();
  });

  it("marks selected, editing and dragging", () => {
    const { container, rerender } = render(<StoryboardRow {...base} selected />);
    expect(container.firstChild).toHaveClass("ohf-sb-row--selected");
    expect(container.firstChild).toHaveAttribute("aria-current", "true");
    rerender(<StoryboardRow {...base} editing dragging />);
    expect(container.firstChild).toHaveClass("ohf-sb-row--editing", "ohf-sb-row--dragging");
  });

  it("shows a status instead of the prompt, with a tone and an action", () => {
    const { container } = render(
      <StoryboardRow {...base} thumb={{ state: "failed" }} status="생성 실패" statusTone="danger" statusAction={<button type="button">다시 시도</button>} />,
    );
    expect(container.querySelector(".ohf-sb-status")).toHaveClass("ohf-sb-status--danger");
    expect(container.querySelector(".ohf-sb-prompt")).toBeNull();
    expect(screen.getByRole("button", { name: "다시 시도" })).toBeInTheDocument();
  });

  it("turns the counter red past the limit", () => {
    const { container } = render(<StoryboardRow {...base} counter={{ value: 96, max: 90 }} />);
    expect(container.querySelector(".ohf-sb-counter")).toHaveClass("ohf-sb-counter--over");
  });
});
