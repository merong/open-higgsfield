import type { ButtonHTMLAttributes, ReactNode } from "react";

import { Tag } from "@/components/Tag";
import { CheckIcon } from "@/icons";
import { cx } from "@/lib/cx";

import "./FormatCard.scss";

export interface FormatCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "name"> {
  icon: ReactNode;
  name: ReactNode;
  description: ReactNode;
  pressed?: boolean;
  /* Copy for the "coming soon" tag; its presence disables the card. */
  soon?: ReactNode;
}

export function FormatCard({ icon, name, description, pressed = false, soon, className, type, disabled, ...rest }: FormatCardProps) {
  return (
    <button
      type={type ?? "button"}
      className={cx("ohf-fcard", soon !== undefined && "ohf-fcard--soon", className)}
      aria-pressed={pressed}
      disabled={disabled || soon !== undefined}
      {...rest}
    >
      <span className="ohf-fcard-head">
        <span className="ohf-fcard-icon">{icon}</span>
        <span className="ohf-fcard-name">{name}</span>
        <span className="ohf-fcard-spacer" />
        {soon !== undefined ? (
          <Tag tone="muted">{soon}</Tag>
        ) : pressed ? (
          <span className="ohf-fcard-check">
            <CheckIcon size={15} />
          </span>
        ) : null}
      </span>
      <span className="ohf-fcard-desc">{description}</span>
    </button>
  );
}
