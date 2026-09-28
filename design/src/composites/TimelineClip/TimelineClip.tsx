import type { ButtonHTMLAttributes } from "react";
import { FilmIcon } from "@/icons";
import { cx } from "@/lib/cx";
import "./TimelineClip.scss";
export interface TimelineClipProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  duration: string;
  thumbnail?: string;
  selected?: boolean;
}
export function TimelineClip({
  label,
  duration,
  thumbnail,
  selected = false,
  className,
  ...rest
}: TimelineClipProps) {
  return (
    <button
      {...rest}
      type="button"
      aria-pressed={selected}
      className={cx("ohf-timeline-clip", className)}
    >
      {thumbnail ? <img src={thumbnail} alt="" /> : <FilmIcon />}
      <span>
        {label}
        <small>{duration}</small>
      </span>
    </button>
  );
}
