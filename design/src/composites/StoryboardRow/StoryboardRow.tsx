import type { HTMLAttributes, ReactNode } from "react";

import { Tag } from "@/components/Tag";
import { Thumb, type ThumbProps } from "@/components/Thumb";
import { GripIcon, ImageIcon } from "@/icons";
import { cx } from "@/lib/cx";

import "./StoryboardRow.scss";

export interface StoryboardRowProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  index: number;
  thumb: ThumbProps;
  tag?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  counter?: { value: number; max: number };
  /* The right column is either the prompt or a status line; a status wins. */
  prompt?: ReactNode;
  promptIcon?: ReactNode;
  status?: ReactNode;
  statusTone?: "default" | "live" | "danger";
  statusAction?: ReactNode;
  actions?: ReactNode;
  selected?: boolean;
  editing?: boolean;
  dragging?: boolean;
  onSelect?: () => void;
}

export function StoryboardRow({
  index,
  thumb,
  tag,
  title,
  sub,
  counter,
  prompt,
  promptIcon,
  status,
  statusTone = "default",
  statusAction,
  actions,
  selected = false,
  editing = false,
  dragging = false,
  onSelect,
  className,
  ...rest
}: StoryboardRowProps) {
  const over = counter !== undefined && counter.value > counter.max;
  return (
    <div
      className={cx(
        "ohf-sb-row",
        selected && "ohf-sb-row--selected",
        editing && "ohf-sb-row--editing",
        dragging && "ohf-sb-row--dragging",
        className,
      )}
      aria-current={selected ? "true" : undefined}
      {...rest}
    >
      <div className="ohf-sb-num">
        <span className="ohf-sb-grip" aria-hidden="true">
          <GripIcon size={14} />
        </span>
        <span>{index}</span>
      </div>
      <Thumb {...thumb} />
      <div className="ohf-sb-text">
        {tag !== undefined && <Tag>{tag}</Tag>}
        {/* A real <button>, not the row's own onClick: keyboard-reachable, and its
            ::after (below) stretches to the row's own bounds so the whole row still
            reads as one hit target. While editing, the slot may hold an input instead
            of plain text, which must not sit inside a button. */}
        {onSelect && !editing ? (
          <button type="button" className="ohf-sb-title ohf-sb-select" onClick={onSelect}>
            {title}
          </button>
        ) : (
          <div className="ohf-sb-title">{title}</div>
        )}
        {(sub !== undefined || counter) && (
          <div className="ohf-sb-sub">
            <span className="ohf-sb-sub-text">{sub}</span>
            {counter && (
              <span className={cx("ohf-sb-counter", over && "ohf-sb-counter--over")}>
                {counter.value} / {counter.max}
              </span>
            )}
          </div>
        )}
      </div>
      <div className="ohf-sb-side">
        {status !== undefined ? (
          <span className={cx("ohf-sb-status", statusTone !== "default" && `ohf-sb-status--${statusTone}`)}>
            {statusTone === "live" && <span className="ohf-sb-lamp" aria-hidden="true" />}
            {status}
          </span>
        ) : prompt !== undefined ? (
          <span className="ohf-sb-prompt">
            <span className="ohf-sb-prompt-ic">{promptIcon ?? <ImageIcon size={13} />}</span>
            <span className="ohf-sb-prompt-text">{prompt}</span>
          </span>
        ) : null}
        {/* Lifted above the select button's stretched hit area (z-index in the
            SCSS) so its own click reaches this action, not the row selection. */}
        <span className="ohf-sb-status-action">{statusAction}</span>
      </div>
      <div className="ohf-sb-actions">{actions}</div>
    </div>
  );
}
