import type { InputHTMLAttributes, Ref } from "react";

import { cx } from "@/lib/cx";

import "./Input.scss";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  invalid?: boolean;
  ref?: Ref<HTMLInputElement>;
}

export function Input({ invalid = false, className, ...rest }: InputProps) {
  return <input className={cx("ohf-input", className)} aria-invalid={invalid || undefined} {...rest} />;
}
