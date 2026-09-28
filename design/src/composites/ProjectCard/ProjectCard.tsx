import type { ReactNode } from "react";

import { CheckIcon } from "@/icons";
import { cx } from "@/lib/cx";

import "./ProjectCard.scss";

export interface ProjectCardProps {
  href?: string;
  onClick?: () => void;
  deck: ReactNode;
  cover?: ReactNode;
  title: ReactNode;
  meta: ReactNode;
  status?: ReactNode;
  statusTone?: "done" | "live" | "draft";
  className?: string;
}

export function ProjectCard({
  href,
  onClick,
  deck,
  cover,
  title,
  meta,
  status,
  statusTone = "done",
  className,
}: ProjectCardProps) {
  const body = (
    <>
      {cover && <div className="ohf-pcard-cover">{cover}</div>}
      <div className="ohf-pcard-deck">{deck}</div>
      <div className="ohf-pcard-body">
        <div className="ohf-pcard-title">{title}</div>
        <div className="ohf-pcard-meta">
          <span>{meta}</span>
          <span className="ohf-pcard-spacer" />
          {status !== undefined && (
            <span
              className={cx(
                "ohf-pcard-status",
                `ohf-pcard-status--${statusTone}`,
              )}
            >
              {statusTone === "live" && (
                <span className="ohf-pcard-lamp" aria-hidden="true" />
              )}
              {statusTone === "done" && <CheckIcon size={13} />}
              {status}
            </span>
          )}
        </div>
      </div>
    </>
  );
  const cls = cx("ohf-pcard", className);
  return href !== undefined ? (
    <a className={cls} href={href}>
      {body}
    </a>
  ) : (
    <button type="button" className={cls} onClick={onClick}>
      {body}
    </button>
  );
}
