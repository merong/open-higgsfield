import type { ReactNode } from "react";

import { cx } from "@/lib/cx";

export interface CoverSlideProps {
  kicker?: ReactNode;
  title: ReactNode;
  sub?: ReactNode;
  titleSize?: "md" | "lg";
}

export function CoverSlide({
  kicker,
  title,
  sub,
  titleSize = "lg",
}: CoverSlideProps) {
  return (
    <>
      {kicker !== undefined && (
        <span className="ohf-slide-kicker">{kicker}</span>
      )}
      <h2
        className={cx(
          "ohf-slide-title",
          titleSize === "md" && "ohf-slide-title--md",
        )}
      >
        {title}
      </h2>
      {sub !== undefined && <p className="ohf-slide-sub">{sub}</p>}
    </>
  );
}

export interface BodySlideProps {
  title: ReactNode;
  body: ReactNode;
}

export function BodySlide({ title, body }: BodySlideProps) {
  return (
    <>
      <h2 className="ohf-slide-h">{title}</h2>
      <p className="ohf-slide-text">{body}</p>
    </>
  );
}

export interface ListSlideProps {
  title: ReactNode;
  items: readonly { label: ReactNode; value?: ReactNode }[];
  numbered?: boolean;
}

export function ListSlide({ title, items, numbered = true }: ListSlideProps) {
  return (
    <>
      <h2 className="ohf-slide-h">{title}</h2>
      <ol className="ohf-slide-list">
        {items.map((item, i) => (
          <li key={i} className="ohf-slide-item">
            {numbered && (
              <em className="ohf-slide-num">
                {String(i + 1).padStart(2, "0")}
              </em>
            )}
            <span className="ohf-slide-item-label">{item.label}</span>
            {item.value !== undefined && (
              <span className="ohf-slide-item-value">{item.value}</span>
            )}
          </li>
        ))}
      </ol>
    </>
  );
}

export interface QuoteSlideProps {
  quote: ReactNode;
  source?: ReactNode;
}

export function QuoteSlide({ quote, source }: QuoteSlideProps) {
  return (
    <>
      <span className="ohf-slide-qmark" aria-hidden="true">
        “
      </span>
      <blockquote className="ohf-slide-quote">{quote}</blockquote>
      {source !== undefined && <p className="ohf-slide-src">{source}</p>}
    </>
  );
}

export interface CtaSlideProps {
  title: ReactNode;
  sub?: ReactNode;
  pill?: ReactNode;
}

export function CtaSlide({ title, sub, pill }: CtaSlideProps) {
  return (
    <>
      <h2 className="ohf-slide-h">{title}</h2>
      {sub !== undefined && <p className="ohf-slide-sub">{sub}</p>}
      {pill !== undefined && <span className="ohf-slide-pill">{pill}</span>}
    </>
  );
}

export interface MetricSlideProps {
  value: ReactNode;
  unit?: ReactNode;
  title: ReactNode;
  detail?: ReactNode;
}
export function MetricSlide({ value, unit, title, detail }: MetricSlideProps) {
  return (
    <>
      <div className="ohf-slide-metric">
        {value}
        <span>{unit}</span>
      </div>
      <h2 className="ohf-slide-h">{title}</h2>
      {detail && <p className="ohf-slide-text">{detail}</p>}
    </>
  );
}
export interface CompareSlideProps {
  title: ReactNode;
  columns: readonly { label: ReactNode; body: ReactNode }[];
}
export function CompareSlide({ title, columns }: CompareSlideProps) {
  return (
    <>
      <h2 className="ohf-slide-h">{title}</h2>
      <div className="ohf-slide-compare">
        {columns.map((c, i) => (
          <div key={i}>
            <h3>{c.label}</h3>
            <p>{c.body}</p>
          </div>
        ))}
      </div>
    </>
  );
}
