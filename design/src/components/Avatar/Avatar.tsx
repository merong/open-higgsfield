import type { HTMLAttributes } from "react";

import { cx } from "@/lib/cx";

import "./Avatar.scss";

export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
  initials?: string;
  src?: string;
  alt?: string;
  size?: 28 | 32 | 44;
}

export function Avatar({ initials, src, alt = "", size = 32, className, ...rest }: AvatarProps) {
  return (
    <span className={cx("ohf-avatar", `ohf-avatar--${size}`, className)} {...rest}>
      {src ? <img className="ohf-avatar-img" src={src} alt={alt} /> : initials}
    </span>
  );
}
