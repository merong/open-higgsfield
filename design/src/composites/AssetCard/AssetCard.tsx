import type { ButtonHTMLAttributes } from "react";
import { CheckIcon, ImageIcon } from "@/icons";
import { cx } from "@/lib/cx";
import "./AssetCard.scss";
export interface AssetCardProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  src?: string;
  title: string;
  meta?: string;
  selected?: boolean;
}
export function AssetCard({
  src,
  title,
  meta,
  selected = false,
  className,
  ...rest
}: AssetCardProps) {
  return (
    <button
      {...rest}
      type="button"
      aria-pressed={selected}
      className={cx("ohf-asset-card", className)}
    >
      <span className="ohf-asset-card-image">
        {src ? (
          <img src={src} alt="" loading="lazy" />
        ) : (
          <ImageIcon size={24} />
        )}
        {selected && (
          <span className="ohf-asset-card-check">
            <CheckIcon />
          </span>
        )}
      </span>
      <span className="ohf-asset-card-title">{title}</span>
      {meta && <span className="ohf-asset-card-meta">{meta}</span>}
    </button>
  );
}
