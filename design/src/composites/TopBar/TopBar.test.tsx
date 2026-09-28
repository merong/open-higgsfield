import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { TopBar } from "./TopBar";

it("holds brand, scope tabs, credits and account", () => {
  render(
    <TopBar
      brand="OpenHiggsfield"
      brandLabel="홈"
      nav={{ items: [{ id: "studio", label: "Studio" }, { id: "projects", label: "Projects" }], value: "projects", onChange: () => {}, "aria-label": "구역" }}
      credits={1240}
      creditsUnit="크레딧"
      topUp={<button type="button">충전</button>}
      avatar={<span data-testid="avatar" />}
    />,
  );
  expect(screen.getByRole("banner")).toHaveClass("ohf-appbar");
  expect(screen.getByRole("link", { name: "홈" })).toHaveClass("ohf-appbar-brand");
  expect(screen.getByRole("tab", { name: "Projects" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByText("1,240")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "충전" })).toBeInTheDocument();
  expect(screen.getByTestId("avatar")).toBeInTheDocument();
});
