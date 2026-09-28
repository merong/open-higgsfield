import type { CSSProperties, HTMLAttributes, ReactNode } from "react";

import { cx } from "@/lib/cx";
import { ratioToCss } from "@/lib/ratio";

import { SLIDE_STYLES, type SlidePreset } from "./styles";

import "./slides.scss";

export type SlideRatio = "4:5" | "3:4" | "1:1" | "9:16";
export type SlideComposition = "full" | "split" | "inset";

export type SlidePosition = "start" | "mid" | "end";

export interface SlideFrameProps extends HTMLAttributes<HTMLDivElement> {
  preset: SlidePreset;
  ratio?: SlideRatio;
  image?: string;
  composition?: SlideComposition;
  imagePosition?: string;
  edition?: ReactNode;
  /* A number is a flat scrim (0–1); "grad" darkens toward the bottom. */
  dim?: number | "grad";
  handle?: ReactNode;
  page?: ReactNode;
  showFooter?: boolean;
  position?: SlidePosition;
  children: ReactNode;
}

export function SlideFrame({
  preset,
  ratio = "4:5",
  image,
  dim,
  composition = "full",
  imagePosition = "center top",
  edition,
  handle,
  page,
  showFooter = true,
  position = "end",
  className,
  style,
  children,
  ...rest
}: SlideFrameProps) {
  const s = SLIDE_STYLES[preset];
  const effectiveComposition = image ? composition : "full";
  const overlay = Boolean(image) && effectiveComposition === "full";
  /* Over a picture the type is always white: the scrim, not the preset,
     carries the contrast. */
  const vars = {
    "--sl-bg": s.bg,
    "--sl-rule": overlay ? "rgba(255, 255, 255, 0.28)" : s.rule,
    "--sl-image-position": imagePosition,
    "--sl-tx": overlay ? "#ffffff" : s.tx,
    "--sl-acc": s.acc,
    "--sl-acc-ink": s.accInk,
    "--sl-head": s.head.family,
    "--sl-head-weight": s.head.weight,
    "--sl-head-ls": s.head.letterSpacing,
    "--sl-head-lh": s.head.lineHeight,
    "--sl-body": s.body.family,
    ...(typeof dim === "number"
      ? {
          "--sl-dim": Math.max(
            0,
            Math.min(1, Number.isFinite(dim) ? dim : 0.5),
          ),
        }
      : null),
  } as CSSProperties;
  return (
    <div
      className={cx(
        "ohf-slide",
        `ohf-slide--${position}`,
        overlay && "ohf-slide--photo",
        `ohf-slide--${effectiveComposition}`,
        className,
      )}
      data-preset={preset}
      data-ratio={ratio}
      style={{ ...vars, aspectRatio: ratioToCss(ratio, "4 / 5"), ...style }}
      {...rest}
    >
      {image && <img className="ohf-slide-img" src={image} alt="" />}
      {overlay && dim !== undefined && (
        <div
          className={cx(
            "ohf-slide-dim",
            dim === "grad" && "ohf-slide-dim--grad",
          )}
          aria-hidden="true"
        />
      )}
      {edition && <div className="ohf-slide-edition">{edition}</div>}
      <div className="ohf-slide-body">{children}</div>
      {showFooter && (handle !== undefined || page !== undefined) && (
        <div className="ohf-slide-foot">
          <span>{handle}</span>
          <span>{page}</span>
        </div>
      )}
    </div>
  );
}
