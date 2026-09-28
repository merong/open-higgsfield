import type { CSSProperties } from "react";
import { cx } from "@/lib/cx";
import "./Progress.scss";
export interface ProgressProps {
  value?: number;
  max?: number;
  label: string;
  detail?: string;
  tone?: "default" | "danger";
  className?: string;
}
export function Progress({
  value,
  max = 100,
  label,
  detail,
  tone = "default",
  className,
}: ProgressProps) {
  const limit = Number.isFinite(max) && max > 0 ? max : 100;
  const current =
    value === undefined || !Number.isFinite(value)
      ? undefined
      : Math.max(0, Math.min(limit, value));
  return (
    <div className={cx("ohf-progress", `ohf-progress--${tone}`, className)}>
      <div className="ohf-progress-label">
        <span>{label}</span>
        {detail && <span>{detail}</span>}
      </div>
      <div
        className="ohf-progress-track"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={limit}
        aria-valuenow={current}
        data-indeterminate={current === undefined || undefined}
        style={
          {
            "--progress": `${current === undefined ? 35 : (current / limit) * 100}%`,
          } as CSSProperties
        }
      >
        <i />
      </div>
    </div>
  );
}
