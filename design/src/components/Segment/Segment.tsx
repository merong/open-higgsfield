import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react";

import { cx } from "@/lib/cx";

import "./Segment.scss";

export interface SegmentItem {
  id: string;
  label: ReactNode;
  icon?: ReactNode;
  "aria-label"?: string;
}

export interface SegmentProps {
  items: readonly SegmentItem[];
  value: string;
  onChange: (id: string) => void;
  size?: "sm" | "md";
  /* A plate of its own for use outside the studio's floating bar. */
  plate?: boolean;
  "aria-label": string;
  className?: string;
}

export function Segment({
  items,
  value,
  onChange,
  size = "md",
  plate = false,
  className,
  "aria-label": ariaLabel,
}: SegmentProps) {
  const tabsRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState<{ x: number; w: number } | null>(null);

  /* The indicator is measured rather than derived from equal columns, so it
     morphs to each label's real width instead of padding the short ones. */
  useEffect(() => {
    const tabs = tabsRef.current;
    if (!tabs) return;
    let live = true;
    const measure = () => {
      const active = tabs.querySelector<HTMLElement>('[aria-selected="true"]');
      if (live && active)
        setThumb((previous) =>
          previous?.x === active.offsetLeft && previous.w === active.offsetWidth
            ? previous
            : { x: active.offsetLeft, w: active.offsetWidth },
        );
      else if (live) setThumb(null);
    };
    measure();
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    observer?.observe(tabs);
    // The face swaps in after first paint and the labels resize under it.
    void document.fonts?.ready.then(measure);
    return () => {
      live = false;
      observer?.disconnect();
    };
  }, [value, items]);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!items.length) return;
    const from = items.findIndex((item) => item.id === value);
    const to =
      event.key === "ArrowRight"
        ? (from + 1) % items.length
        : event.key === "ArrowLeft"
          ? (from - 1 + items.length) % items.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? items.length - 1
              : -1;
    if (to < 0) return;
    event.preventDefault();
    onChange(items[to]!.id);
    tabsRef.current?.querySelectorAll<HTMLElement>('[role="tab"]')[to]?.focus();
  };

  const list = (
    <div
      ref={tabsRef}
      role="tablist"
      aria-label={ariaLabel}
      className={cx(
        "ohf-tabs",
        size === "sm" && "ohf-tabs--sm",
        !plate && className,
      )}
      onKeyDown={onKeyDown}
    >
      <span
        className="ohf-thumb"
        data-ready={thumb !== null}
        aria-hidden="true"
        style={
          {
            "--thumb-x": `${thumb?.x ?? 0}px`,
            "--thumb-w": `${thumb?.w ?? 0}px`,
          } as CSSProperties
        }
      />
      {items.map((item) => {
        const selected = item.id === value;
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-label={item["aria-label"]}
            tabIndex={selected ? 0 : -1}
            className="ohf-tab"
            onClick={() => onChange(item.id)}
          >
            {item.icon}
            <span className="ohf-tab-label">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
  return plate ? (
    <div className={cx("ohf-tabs-plate", className)}>{list}</div>
  ) : (
    list
  );
}
