import type { HTMLAttributes, ReactNode } from "react";

import { WarningIcon } from "@/icons";
import { cx } from "@/lib/cx";
import { ratioToCss } from "@/lib/ratio";

import "./Thumb.scss";

export type ThumbState = "image" | "pending" | "failed" | "empty" | "flat";

export interface ThumbProps extends HTMLAttributes<HTMLDivElement> {
  state: ThumbState;
  src?: string;
  alt?: string;
  /* Width in px; the height follows the ratio. */
  size?: number;
  ratio?: string;
  /* The flat state stands in for a slide with no picture: the deck's own
     background and accent, so they arrive from the slide style, not from here. */
  flatColor?: string;
  flatAccent?: string;
  icon?: ReactNode;
}

export function Thumb({
  state,
  src,
  alt = "",
  size = 56,
  ratio = "4:5",
  flatColor = "#1d2a44",
  flatAccent = "#ffd54a",
  icon,
  className,
  style,
  ...rest
}: ThumbProps) {
  return (
    <div
      className={cx("ohf-frame", `ohf-frame--${state}`, className)}
      style={{
        ...style,
        width: size,
        aspectRatio: ratioToCss(ratio, "4 / 5"),
        ...(state === "flat" ? { background: flatColor, color: flatAccent } : null),
      }}
      {...rest}
    >
      {state === "image" && src && <img className="ohf-frame-img" src={src} alt={alt} />}
      {state === "pending" && (
        <>
          <span className="ohf-frame-lamp" aria-hidden="true" />
          <span className="ohf-frame-line ohf-frame-line--1" aria-hidden="true" />
          <span className="ohf-frame-line ohf-frame-line--2" aria-hidden="true" />
        </>
      )}
      {state === "failed" && <span className="ohf-frame-icon">{icon ?? <WarningIcon size={18} />}</span>}
      {state === "flat" && (
        <>
          <span className="ohf-frame-bar ohf-frame-bar--1" aria-hidden="true" />
          <span className="ohf-frame-bar ohf-frame-bar--2" aria-hidden="true" />
          <span className="ohf-frame-bar ohf-frame-bar--pill" aria-hidden="true" />
        </>
      )}
    </div>
  );
}
