import type { ButtonHTMLAttributes, ReactNode } from "react";

import { CheckIcon } from "@/icons";
import { cx } from "@/lib/cx";

import "./StyleCard.scss";

export interface StyleCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "name"> {
  /* Two mini slides (a cover over a photo and a flat CTA), drawn by the caller. */
  preview: ReactNode;
  name: ReactNode;
  description: ReactNode;
  pressed?: boolean;
}

export function StyleCard({ preview, name, description, pressed = false, className, type, ...rest }: StyleCardProps) {
  return (
    <button type={type ?? "button"} className={cx("ohf-scard", className)} aria-pressed={pressed} {...rest}>
      <span className="ohf-scard-preview">{preview}</span>
      <span className="ohf-scard-row">
        <span className="ohf-scard-name">{name}</span>
        <span className="ohf-scard-spacer" />
        {pressed && (
          <span className="ohf-scard-check">
            <CheckIcon size={14} />
          </span>
        )}
      </span>
      <span className="ohf-scard-desc">{description}</span>
    </button>
  );
}
