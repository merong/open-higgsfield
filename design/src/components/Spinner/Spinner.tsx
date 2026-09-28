import { cx } from "@/lib/cx";

export interface SpinnerProps {
  /* With a label the spinner is a live region; without one it is decoration
     next to text that already says what is happening. */
  label?: string;
  className?: string;
}

export function Spinner({ label, className }: SpinnerProps) {
  return label ? (
    <span className={cx("ohf-spinner", className)} role="status" aria-label={label} />
  ) : (
    <span className={cx("ohf-spinner", className)} aria-hidden="true" />
  );
}
