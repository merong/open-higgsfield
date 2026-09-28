import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import * as icons from "./index";

const NEW = [
  "SparkleIcon", "PaletteIcon", "GripIcon", "UserIcon", "FilmIcon", "LayoutIcon",
  "LayersIcon", "PhoneIcon", "TextIcon", "WalletIcon", "ChevronLeftIcon", "ChevronRightIcon",
];

describe("icons", () => {
  const names = Object.keys(icons).filter((k) => k.endsWith("Icon"));

  it("exports 30 studio icons plus 12 new ones", () => {
    expect(names).toHaveLength(42);
    for (const n of NEW) expect(names).toContain(n);
  });

  it("draws every icon on the 16 grid, stroked in currentColor, hidden from readers", () => {
    for (const name of names) {
      const Icon = icons[name as keyof typeof icons] as (p: { size?: number }) => React.JSX.Element;
      const { container, unmount } = render(<Icon size={20} />);
      const svg = container.querySelector("svg");
      expect(svg, name).not.toBeNull();
      expect(svg).toHaveAttribute("viewBox", "0 0 16 16");
      expect(svg).toHaveAttribute("aria-hidden", "true");
      expect(svg).toHaveAttribute("width", "20");
      unmount();
    }
  });
});
