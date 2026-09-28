import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import "./Field.scss";

export interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  /* Marks are copy, so they arrive as nodes ("필수", "선택"), never booleans. */
  required?: ReactNode;
  optional?: ReactNode;
  counter?: { value: number; max: number };
  error?: ReactNode;
  /* A value shown on the label's row, as the studio's setting popovers do. */
  value?: ReactNode;
  htmlFor?: string;
  children: ReactNode;
  className?: string;
}

export function Field({ label, hint, required, optional, counter, error, value, htmlFor, children, className }: FieldProps) {
  const over = counter !== undefined && counter.value > counter.max;
  return (
    <div className={cx("ohf-field", (Boolean(error) || over) && "ohf-field--error", className)}>
      <div className="ohf-field-row">
        <label className="ohf-field-label" htmlFor={htmlFor}>
          {label}
          {required && <span className="ohf-field-mark ohf-field-mark--req">{required}</span>}
          {optional && <span className="ohf-field-mark">{optional}</span>}
        </label>
        {value !== undefined && <span className="ohf-field-value">{value}</span>}
        {counter && (
          <span className={cx("ohf-field-counter", over && "ohf-field-counter--over")}>
            {counter.value} / {counter.max}
          </span>
        )}
      </div>
      {children}
      {hint !== undefined && !error && <div className="ohf-field-hint">{hint}</div>}
      {error !== undefined && (
        <div className="ohf-field-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
