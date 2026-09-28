import type { HTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/cx";

import "./Tag.scss";

export type TagTone = "default" | "accent" | "muted";

export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: TagTone;
  children: ReactNode;
}

export function Tag({ tone = "default", className, children, ...rest }: TagProps) {
  return (
    <span className={cx("ohf-tag", tone !== "default" && `ohf-tag--${tone}`, className)} {...rest}>
      {children}
    </span>
  );
}
