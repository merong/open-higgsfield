"use client";

import Link from "next/link";
import { FORMATS } from "@/projects/formats";
import type { FormatId } from "@/projects/types";
import "./format-selector.css";

type FormatSelectorProps = {
  value?: FormatId;
  onChange?: (format: FormatId) => void;
  disabled?: boolean;
  hint?: string;
};

/** One feature selector for the project list, creation flows, and editors. */
export function FormatSelector({ value, onChange, disabled, hint }: FormatSelectorProps) {
  return (
    <div className="ws-format-selector" role="group" aria-label="제작 기능 선택">
      <div className="ws-format-selector-grid">
        {FORMATS.map((format) => {
          const selected = value === format.id;
          const content = <>
            <span className="ws-format-selector-art" aria-hidden="true">
              <img src={format.thumbnail} alt="" width={440} height={360} />
              <span className="ws-format-selector-headline">{format.artworkTitle}</span>
              <span className="ws-format-selector-badge">{format.artworkBadge}</span>
              {selected && <span className="ws-format-selector-selected">✓ 선택됨</span>}
            </span>
            <span className="ws-format-selector-copy">
              <span className="ws-format-selector-title">{format.label}</span>
              <span className="ws-format-selector-description">{format.description}</span>
              <span className="ws-format-selector-output">{format.output}</span>
            </span>
          </>;
          return onChange ? (
            <button key={format.id} type="button" className="ws-format-selector-card"
              data-format={format.id} aria-label={format.label} aria-pressed={selected}
              disabled={disabled} onClick={() => { if (!selected) onChange(format.id); }}>
              {content}
            </button>
          ) : (
            <Link key={format.id} href={`/projects/new?format=${format.id}`}
              className="ws-format-selector-card" data-format={format.id} aria-label={`${format.label} 만들기`}>
              {content}
            </Link>
          );
        })}
      </div>
      {hint && <p className="ws-format-selector-hint">{hint}</p>}
    </div>
  );
}
