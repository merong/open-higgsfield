import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

import { CaretDownIcon } from "@/icons";
import { cx } from "@/lib/cx";

import "./Pill.scss";

export interface PillProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "value"> {
  glyph?: ReactNode;
  label?: ReactNode;
  value: ReactNode;
  /* Given, the pill opens a panel and says whether it is open. */
  expanded?: boolean;
  caret?: boolean;
  ref?: Ref<HTMLButtonElement>;
}

export function Pill({ glyph, label, value, expanded, caret = true, className, type, ...rest }: PillProps) {
  return (
    <button type={type ?? "button"} className={cx("ohf-ctl", className)} aria-expanded={expanded} {...rest}>
      {glyph && <span className="ohf-ctl-glyph">{glyph}</span>}
      {label !== undefined && <span className="ohf-ctl-label">{label}</span>}
      <span className="ohf-ctl-value">{value}</span>
      {caret && (
        <span className="ohf-ctl-caret" aria-hidden="true">
          <CaretDownIcon />
        </span>
      )}
    </button>
  );
}
