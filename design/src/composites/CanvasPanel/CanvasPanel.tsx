import type { ReactNode } from "react";

import { IconButton } from "@/components/IconButton";
import { Segment, type SegmentProps } from "@/components/Segment";
import { ChevronLeftIcon, ChevronRightIcon } from "@/icons";
import { cx } from "@/lib/cx";

import "./CanvasPanel.scss";

export interface CanvasPanelProps {
  mode: SegmentProps;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  prevLabel: string;
  nextLabel: string;
  stage: ReactNode;
  templates?: { label: ReactNode; chips: ReactNode };
  options?: { label: ReactNode; pills: ReactNode };
  actions?: ReactNode;
  hint?: ReactNode;
  inspector?: ReactNode;
  className?: string;
}

export function CanvasPanel({
  mode,
  index,
  total,
  onPrev,
  onNext,
  prevLabel,
  nextLabel,
  stage,
  templates,
  options,
  actions,
  hint,
  inspector,
  className,
}: CanvasPanelProps) {
  return (
    <aside className={cx("ohf-canvas", className)}>
      <div className="ohf-canvas-head">
        <Segment {...mode} size="sm" plate />
        <span className="ohf-canvas-spacer" />
        <IconButton
          ghost
          size={30}
          icon={<ChevronLeftIcon />}
          aria-label={prevLabel}
          onClick={onPrev}
          disabled={index <= 1}
        />
        <span className="ohf-canvas-pager">
          {index} / {total}
        </span>
        <IconButton
          ghost
          size={30}
          icon={<ChevronRightIcon />}
          aria-label={nextLabel}
          onClick={onNext}
          disabled={index >= total}
        />
      </div>
      <div className="ohf-canvas-stage">{stage}</div>
      <div className="ohf-canvas-foot">
        {templates && (
          <div className="ohf-canvas-row">
            <span className="ohf-canvas-label">{templates.label}</span>
            {templates.chips}
          </div>
        )}
        {options && (
          <div className="ohf-canvas-row">
            <span className="ohf-canvas-label">{options.label}</span>
            {options.pills}
          </div>
        )}
        {actions !== undefined && (
          <div className="ohf-canvas-actions">{actions}</div>
        )}
        {inspector}
        {hint !== undefined && <div className="ohf-canvas-hint">{hint}</div>}
      </div>
    </aside>
  );
}
