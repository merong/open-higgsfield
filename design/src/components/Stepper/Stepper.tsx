import type { ReactNode } from "react";

import { MinusIcon, PlusIcon } from "@/icons";
import { cx } from "@/lib/cx";

import "./Stepper.scss";

export interface StepperProps {
  value: number;
  min: number;
  max: number;
  onChange: (next: number) => void;
  suffix?: ReactNode;
  decrementLabel: string;
  incrementLabel: string;
  className?: string;
}

export function Stepper({ value, min, max, onChange, suffix, decrementLabel, incrementLabel, className }: StepperProps) {
  return (
    <div className={cx("ohf-batch", className)} role="group">
      <button
        type="button"
        className="ohf-batch-step"
        aria-label={decrementLabel}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <MinusIcon />
      </button>
      <span className="ohf-batch-value" aria-live="polite">
        {value}
        {suffix !== undefined && <span className="ohf-batch-max">{suffix}</span>}
      </span>
      <button
        type="button"
        className="ohf-batch-step"
        aria-label={incrementLabel}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + 1))}
      >
        <PlusIcon />
      </button>
    </div>
  );
}
