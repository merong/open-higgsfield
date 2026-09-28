import type { ButtonHTMLAttributes } from "react";

import { cx } from "@/lib/cx";

import "./Switch.scss";

export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "onChange" | "type" | "aria-label" | "children"> {
  checked: boolean;
  onChange: (next: boolean) => void;
  "aria-label": string;
  disabled?: boolean;
  className?: string;
}

export function Switch({ checked, onChange, disabled = false, className, "aria-label": ariaLabel, ...rest }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      className={cx("ohf-switch", className)}
      onClick={() => onChange(!checked)}
      {...rest}
    >
      <span className="ohf-switch-knob" aria-hidden="true" />
    </button>
  );
}
