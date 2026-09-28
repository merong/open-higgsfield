import type { ButtonHTMLAttributes, CSSProperties, HTMLAttributes, ReactNode, Ref } from "react";

import { cx } from "@/lib/cx";

import "./Popover.scss";

export type PopoverVariant = "setting" | "list" | "picker" | "menu" | "assets";

export interface PopoverProps extends HTMLAttributes<HTMLDivElement> {
  variant: PopoverVariant;
  /* "up" is the studio's own (anchored above the composer). "static" takes the
     panel out of the flow of positioning, for previews. */
  placement?: "up" | "down" | "static";
  head?: ReactNode;
  x?: number;
  y?: number;
  ref?: Ref<HTMLDivElement>;
}

export function Popover({ variant, placement = "up", head, x, y, className, style, children, ...rest }: PopoverProps) {
  const pos = {
    ...(x !== undefined ? { "--ohf-pop-x": `${x}px` } : null),
    ...(y !== undefined ? { "--ohf-pop-y": `${y}px` } : null),
  } as CSSProperties;
  return (
    <div
      className={cx("ohf-popover", `ohf-popover--${variant}`, placement !== "up" && `ohf-popover--${placement}`, className)}
      style={{ ...pos, ...style }}
      {...rest}
    >
      {head !== undefined && <div className="ohf-pop-head">{head}</div>}
      {children}
    </div>
  );
}

export function Menu({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div role="menu" className={cx("ohf-menu", className)} {...rest} />;
}

export interface MenuRowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon?: ReactNode;
  label: ReactNode;
  count?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

export function MenuRow({ icon, label, count, className, type, ...rest }: MenuRowProps) {
  return (
    <button type={type ?? "button"} role="menuitem" className={cx("ohf-menu-row", className)} {...rest}>
      {icon && <span className="ohf-menu-ic">{icon}</span>}
      <span className="ohf-menu-label">{label}</span>
      {count !== undefined && <span className="ohf-menu-count">{count}</span>}
    </button>
  );
}
