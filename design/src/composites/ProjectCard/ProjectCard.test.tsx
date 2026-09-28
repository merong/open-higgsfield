import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { ProjectCard } from "./ProjectCard";

it("is a link card with a deck, title, meta and a status tone", () => {
  render(<ProjectCard href="/p/1" deck={<span data-testid="deck" />} title="아침 루틴" meta="카드뉴스 · 6장" status="3장 생성 중" statusTone="live" />);
  const card = screen.getByRole("link", { name: /아침 루틴/ });
  expect(card).toHaveClass("ohf-pcard");
  expect(card.querySelector(".ohf-pcard-status")).toHaveClass("ohf-pcard-status--live");
  expect(screen.getByTestId("deck").closest(".ohf-pcard-deck")).not.toBeNull();
});

it("is a button without href", () => {
  render(<ProjectCard onClick={() => {}} deck={null} title="t" meta="m" />);
  expect(screen.getByRole("button")).toHaveClass("ohf-pcard");
});
