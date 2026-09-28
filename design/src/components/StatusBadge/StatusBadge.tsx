import type { HTMLAttributes } from "react";
import { cx } from "@/lib/cx";
import "./StatusBadge.scss";
export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "success" | "warning" | "danger" | "live" | "info";
}
export function StatusBadge({
  tone = "neutral",
  className,
  children,
  ...rest
}: StatusBadgeProps) {
  return (
    <span
      {...rest}
      className={cx("ohf-status", `ohf-status--${tone}`, className)}
    >
      <i aria-hidden="true" />
      {children}
    </span>
  );
}
