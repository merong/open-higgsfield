import type { HTMLAttributes, ReactNode } from "react";

import { GemIcon } from "@/icons";
import { cx } from "@/lib/cx";

import "./CreditBadge.scss";

export interface CreditBadgeProps extends HTMLAttributes<HTMLSpanElement> {
  amount: number;
  unit?: ReactNode;
  icon?: ReactNode;
  locale?: string;
}

export function CreditBadge({ amount, unit, icon, locale = "ko-KR", className, ...rest }: CreditBadgeProps) {
  return (
    <span className={cx("ohf-credit", className)} {...rest}>
      <span className="ohf-credit-icon">{icon ?? <GemIcon />}</span>
      <span className="ohf-credit-amount">{amount.toLocaleString(locale)}</span>
      {unit !== undefined && <span className="ohf-credit-unit">{unit}</span>}
    </span>
  );
}
