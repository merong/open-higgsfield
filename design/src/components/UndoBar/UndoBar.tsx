import type { ReactNode } from "react";

import { UndoIcon } from "@/icons";
import { cx } from "@/lib/cx";

export interface UndoBarProps {
  text: ReactNode;
  actionLabel: ReactNode;
  onAction: () => void;
  /* The window to change your mind, drawn by the drain bar from the same
     number that clears the record. */
  durationMs: number;
  icon?: ReactNode;
  className?: string;
}

export function UndoBar({ text, actionLabel, onAction, durationMs, icon, className }: UndoBarProps) {
  return (
    <div className={cx("ohf-undo", className)} role="status">
      <span className="ohf-undo-drain" style={{ animationDuration: `${durationMs}ms` }} aria-hidden="true" />
      <span className="ohf-undo-text">{text}</span>
      <button type="button" className="ohf-undo-act" onClick={onAction}>
        {icon ?? <UndoIcon />}
        {actionLabel}
      </button>
    </div>
  );
}
