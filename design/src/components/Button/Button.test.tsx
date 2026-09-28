import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button } from "./Button";

describe("Button", () => {
  it("is a real button of type button by default", () => {
    render(<Button>생성</Button>);
    const el = screen.getByRole("button", { name: "생성" });
    expect(el).toHaveAttribute("type", "button");
    expect(el).toHaveClass("ohf-btn", "ohf-btn--secondary", "ohf-btn--md");
  });

  it("renders variant and size as modifiers", () => {
    render(<Button variant="primary" size="lg">생성</Button>);
    expect(screen.getByRole("button")).toHaveClass("ohf-btn--primary", "ohf-btn--lg");
  });

  it("becomes a link when given href", () => {
    render(<Button href="/projects">프로젝트</Button>);
    expect(screen.getByRole("link", { name: "프로젝트" })).toHaveAttribute("href", "/projects");
  });

  it("is disabled while busy and says so with data-busy", () => {
    render(<Button busy>생성 중</Button>);
    const el = screen.getByRole("button");
    expect(el).toBeDisabled();
    expect(el).toHaveAttribute("data-busy", "true");
  });

  it("swaps the icon for a spinner while loading", () => {
    const { container } = render(<Button loading icon={<svg data-testid="ic" />}>저장</Button>);
    expect(container.querySelector(".ohf-spinner")).not.toBeNull();
    expect(screen.queryByTestId("ic")).toBeNull();
    expect(screen.getByRole("button")).toBeDisabled();
  });

  it("shows a keyboard hint", () => {
    render(<Button kbd="⌘↵">생성</Button>);
    expect(screen.getByRole("button").querySelector("kbd")).toHaveTextContent("⌘↵");
  });
});
