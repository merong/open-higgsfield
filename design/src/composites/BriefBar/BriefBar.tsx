import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

import "./BriefBar.scss";

export interface BriefBarProps {
  label: ReactNode;
  topic: ReactNode;
  pills?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function BriefBar({ label, topic, pills, action, className }: BriefBarProps) {
  return (
    <div className={cx("ohf-brief", className)}>
      <span className="ohf-brief-label">{label}</span>
      <span className="ohf-brief-topic">{topic}</span>
      {pills}
      {action}
    </div>
  );
}
