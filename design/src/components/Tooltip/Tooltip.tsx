import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/cx";

import "./Tooltip.scss";

export interface TooltipProps extends HTMLAttributes<HTMLSpanElement> {
  label: string;
  align?: "start" | "end";
  children: ReactNode;
}

export function Tooltip({ label, align, className, children, ...rest }: TooltipProps) {
  return (
    <span className={cx("ohf-tip", align && `ohf-tip--${align}`, className)} data-tip={label} {...rest}>
      {children}
    </span>
  );
}
