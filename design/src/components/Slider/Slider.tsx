import type { CSSProperties } from "react";

import { cx } from "@/lib/cx";

export interface SliderProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (next: number) => void;
  "aria-label": string;
  className?: string;
}

export function Slider({ min, max, step = 1, value, onChange, className, "aria-label": ariaLabel }: SliderProps) {
  const fill = `${(((value - min) / (max - min || 1)) * 100).toFixed(1)}%`;
  return (
    <input
      type="range"
      className={cx("ohf-slider", className)}
      min={min}
      max={max}
      step={step}
      value={value}
      aria-label={ariaLabel}
      style={{ "--fill": fill } as CSSProperties}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}
