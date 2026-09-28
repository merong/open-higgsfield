import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

import { cx } from "@/lib/cx";
import { ratioBox } from "@/lib/ratio";

import "./Chip.scss";

export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  /* Given (true or false) the chip is a toggle; left out it is a plain button. */
  pressed?: boolean;
  dot?: boolean;
  ratio?: string;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function Chip({ pressed, dot = false, ratio, className, type, children, ...rest }: ChipProps) {
  const box = ratio ? ratioBox(ratio) : null;
  return (
    <button type={type ?? "button"} className={cx("ohf-chip", className)} aria-pressed={pressed} {...rest}>
      {dot && <span className="ohf-chip-dot" aria-hidden="true" />}
      {ratio && <span className="ohf-chip-ratio" aria-hidden="true" style={box ?? undefined} />}
      <span className="ohf-chip-label">{children}</span>
    </button>
  );
}
