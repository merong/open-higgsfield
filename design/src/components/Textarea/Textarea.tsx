import type { Ref, TextareaHTMLAttributes } from "react";

import { cx } from "@/lib/cx";

import "../Input/Input.scss";

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
  ref?: Ref<HTMLTextAreaElement>;
}

export function Textarea({ invalid = false, className, ...rest }: TextareaProps) {
  return <textarea className={cx("ohf-input", "ohf-input--area", className)} aria-invalid={invalid || undefined} {...rest} />;
}
