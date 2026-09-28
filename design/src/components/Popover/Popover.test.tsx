import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";

import { Menu, MenuRow, Popover } from "./Popover";

it("wears the variant and placement as modifiers and a head", () => {
  const { container } = render(
    <Popover variant="menu" placement="static" head="정렬">
      <Menu>
        <MenuRow icon={<svg />} label="최근 수정" count={5} />
      </Menu>
    </Popover>,
  );
  expect(container.firstChild).toHaveClass("ohf-popover", "ohf-popover--menu", "ohf-popover--static");
  expect(container.querySelector(".ohf-pop-head")).toHaveTextContent("정렬");
  expect(screen.getByRole("menu")).toHaveClass("ohf-menu");
  expect(screen.getByRole("menuitem", { name: /최근 수정/ })).toHaveClass("ohf-menu-row");
  expect(container.querySelector(".ohf-menu-count")).toHaveTextContent("5");
});

it("positions itself through the studio's custom properties", () => {
  const { container } = render(<Popover variant="setting" x={120} y={48} />);
  const el = container.firstChild as HTMLElement;
  expect(el.style.getPropertyValue("--ohf-pop-x")).toBe("120px");
  expect(el.style.getPropertyValue("--ohf-pop-y")).toBe("48px");
});
