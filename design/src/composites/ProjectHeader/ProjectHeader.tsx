import type { ReactNode } from "react";

import { IconButton } from "@/components/IconButton";
import { ChevronLeftIcon } from "@/icons";
import { cx } from "@/lib/cx";

import "./ProjectHeader.scss";

export interface ProjectHeaderProps {
  back: { href?: string; onClick?: () => void; label: string };
  title: ReactNode;
  tags?: ReactNode;
  status?: ReactNode;
  actions?: ReactNode;
  className?: string;
}

export function ProjectHeader({ back, title, tags, status, actions, className }: ProjectHeaderProps) {
  return (
    <div className={cx("ohf-phead", className)}>
      {back.href ? (
        <a className="ohf-phead-back" href={back.href} aria-label={back.label}>
          <ChevronLeftIcon size={18} />
        </a>
      ) : (
        <IconButton ghost size={30} icon={<ChevronLeftIcon size={18} />} aria-label={back.label} onClick={back.onClick} />
      )}
      <h1 className="ohf-phead-title">{title}</h1>
      {tags}
      {status !== undefined && <span className="ohf-phead-status">{status}</span>}
      <span className="ohf-phead-spacer" />
      {actions}
    </div>
  );
}
