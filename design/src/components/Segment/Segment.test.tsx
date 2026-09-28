import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { Segment } from "./Segment";

const items = [
  { id: "studio", label: "Studio" },
  { id: "projects", label: "Projects" },
];

it("renders a tablist with one selected tab and a travelling thumb", () => {
  const { container } = render(<Segment items={items} value="projects" onChange={() => {}} aria-label="구역" />);
  expect(screen.getByRole("tablist", { name: "구역" })).toHaveClass("ohf-tabs");
  expect(screen.getByRole("tab", { name: "Projects" })).toHaveAttribute("aria-selected", "true");
  expect(screen.getByRole("tab", { name: "Studio" })).toHaveAttribute("aria-selected", "false");
  expect(container.querySelector(".ohf-thumb")).not.toBeNull();
});

it("changes on click and on arrow keys", () => {
  const onChange = vi.fn();
  render(<Segment items={items} value="studio" onChange={onChange} aria-label="구역" />);
  fireEvent.click(screen.getByRole("tab", { name: "Projects" }));
  expect(onChange).toHaveBeenCalledWith("projects");
  fireEvent.keyDown(screen.getByRole("tablist"), { key: "ArrowRight" });
  expect(onChange).toHaveBeenLastCalledWith("projects");
});

it("wraps in a plate and shrinks on request", () => {
  const { container } = render(<Segment items={items} value="studio" onChange={() => {}} size="sm" plate aria-label="구역" />);
  expect(container.firstChild).toHaveClass("ohf-tabs-plate");
  expect(screen.getByRole("tablist")).toHaveClass("ohf-tabs--sm");
});
