import { useLayoutEffect, useRef } from "react";

import { CheckIcon } from "@/icons";
import { ratioBox } from "@/lib/ratio";

/** One value of an enum, on its own line: the frame the ratio is about to
    make on the left, the mark of the value in force on the right. */
function Option({
  value,
  label,
  active,
  onSelect,
  ratio,
}: {
  value: string;
  label: string;
  active: boolean;
  onSelect: () => void;
  ratio?: boolean;
}) {
  const box = ratio ? ratioBox(value) : null;
  return (
    <button type="button" className="ohf-opt" aria-pressed={active} onClick={onSelect}>
      {/* Every line of a ratio list reserves the glyph box, so the labels of
          "Auto" and "16:9" sit on the same rail. */}
      {ratio && (
        <span className="ohf-opt-ratio" aria-hidden>
          <span className={`ohf-opt-box${box ? "" : " ohf-opt-box--auto"}`} style={box ?? undefined} />
        </span>
      )}
      <span className="ohf-opt-label">{label}</span>
      {active && (
        <span className="ohf-opt-check" aria-hidden>
          <CheckIcon size={12} />
        </span>
      )}
    </button>
  );
}

export interface OptionListProps {
  options: readonly { value: string; label: string }[];
  value: string;
  onChange: (next: string) => void;
  ratio?: boolean;
}

/** The values of one enum, listed down a single column. */
export function OptionList({ options, value, onChange, ratio }: OptionListProps) {
  const listRef = useRef<HTMLDivElement>(null);

  /* A long list opens scrolled to the top, so the value in force is carried
     into view before the panel is painted. */
  useLayoutEffect(() => {
    const list = listRef.current;
    const current = list?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!list || !current) return;
    list.scrollTop = Math.max(0, current.offsetTop - (list.clientHeight - current.offsetHeight) / 2);
  }, []);

  return (
    <div className="ohf-opts ohf-scroll" role="group" ref={listRef}>
      {options.map((option) => (
        <Option
          key={option.value}
          value={option.value}
          label={option.label}
          active={option.value === value}
          ratio={ratio}
          onSelect={() => onChange(option.value)}
        />
      ))}
    </div>
  );
}
