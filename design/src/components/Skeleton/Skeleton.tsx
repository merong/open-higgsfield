import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/cx";
import { ratioToCss } from "@/lib/ratio";

export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  label?: ReactNode;
  clock?: ReactNode;
  ratio?: string;
}

export function Skeleton({ label, clock, ratio, className, style, ...rest }: SkeletonProps) {
  return (
    <div
      className={cx("ohf-skeleton", className)}
      role="status"
      style={ratio ? { ...style, aspectRatio: ratioToCss(ratio, "4 / 3") } : style}
      {...rest}
    >
      {label !== undefined && <span className="ohf-skeleton-label">{label}</span>}
      {clock !== undefined && <span className="ohf-skeleton-clock">{clock}</span>}
    </div>
  );
}
