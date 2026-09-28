import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

import { cx } from "@/lib/cx";

import "./IconButton.scss";

export type IconButtonSize = 28 | 30 | 36;

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> {
  icon: ReactNode;
  "aria-label": string;
  size?: IconButtonSize;
  ghost?: boolean;
  /* One turn of the glyph, fired from the press — the studio's retry mark. */
  spin?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function IconButton({ icon, size = 30, ghost = false, spin = false, className, type, ...rest }: IconButtonProps) {
  return (
    <button
      type={type ?? "button"}
      className={cx("ohf-icon-btn", `ohf-icon-btn--${size}`, ghost && "ohf-icon-btn--ghost", className)}
      data-spin={spin || undefined}
      {...rest}
    >
      {icon}
    </button>
  );
}
