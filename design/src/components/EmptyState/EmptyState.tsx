import { useId, type ReactNode } from "react";
import { cx } from "@/lib/cx";
import "./EmptyState.scss";
export interface EmptyStateProps {
  icon?: ReactNode;
  title: ReactNode;
  description: ReactNode;
  action?: ReactNode;
  className?: string;
}
export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  const id = useId();
  return (
    <section className={cx("ohf-empty-state", className)} aria-labelledby={id}>
      {icon && (
        <span className="ohf-empty-state-icon" aria-hidden="true">
          {icon}
        </span>
      )}
      <h3 id={id}>{title}</h3>
      <p>{description}</p>
      {action && <div>{action}</div>}
    </section>
  );
}
