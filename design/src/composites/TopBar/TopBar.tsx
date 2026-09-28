import type { ReactNode } from "react";

import { CreditBadge } from "@/components/CreditBadge";
import { Segment, type SegmentProps } from "@/components/Segment";
import { cx } from "@/lib/cx";

import "./TopBar.scss";

export interface TopBarProps {
  brand: ReactNode;
  brandHref?: string;
  brandLabel: string;
  nav: SegmentProps;
  credits?: number;
  creditsUnit?: ReactNode;
  topUp?: ReactNode;
  avatar?: ReactNode;
  className?: string;
}

export function TopBar({ brand, brandHref = "/", brandLabel, nav, credits, creditsUnit, topUp, avatar, className }: TopBarProps) {
  return (
    <header className={cx("ohf-appbar", className)}>
      <a className="ohf-appbar-brand" href={brandHref} aria-label={brandLabel}>
        <span className="ohf-appbar-mark" aria-hidden="true">
          <span />
        </span>
        <span className="ohf-appbar-name">{brand}</span>
      </a>
      <Segment {...nav} size="sm" plate />
      <span className="ohf-appbar-spacer" />
      {credits !== undefined && <CreditBadge amount={credits} unit={creditsUnit} />}
      {topUp}
      {avatar}
    </header>
  );
}
