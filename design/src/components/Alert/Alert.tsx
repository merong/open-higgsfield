import type { HTMLAttributes, ReactNode } from "react";

import { WarningIcon } from "@/icons";
import { cx } from "@/lib/cx";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  icon?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}

export function Alert({ icon, action, className, children, ...rest }: AlertProps) {
  return (
    <div role="alert" className={cx("ohf-alert", className)} {...rest}>
      <span className="ohf-alert-ic">{icon ?? <WarningIcon />}</span>
      <div className="ohf-alert-text">{children}</div>
      {action}
    </div>
  );
}
