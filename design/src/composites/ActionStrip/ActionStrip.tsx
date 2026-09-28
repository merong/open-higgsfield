import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import "./ActionStrip.scss";

export interface ActionStripProps {
  status?: ReactNode;
  actions?: ReactNode;
  /* An Alert or UndoBar rides above the row, in the strip's own space —
     the studio gains no second floating layer. */
  notice?: ReactNode;
  className?: string;
}

export function ActionStrip({ status, actions, notice, className }: ActionStripProps) {
  return (
    <div className={cx("ohf-astrip", className)}>
      {notice !== undefined && <div className="ohf-astrip-notice">{notice}</div>}
      <div className="ohf-astrip-row">
        <div className="ohf-astrip-status">{status}</div>
        <span className="ohf-astrip-spacer" />
        {actions}
      </div>
    </div>
  );
}
