import { useId, type InputHTMLAttributes } from "react";
import { SearchIcon, CloseIcon } from "@/icons";
import { cx } from "@/lib/cx";
import "./SearchField.scss";
export interface SearchFieldProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    "value" | "onChange" | "type"
  > {
  value: string;
  onValueChange: (value: string) => void;
  label: string;
  clearLabel: string;
}
export function SearchField({
  value,
  onValueChange,
  label,
  clearLabel,
  className,
  id,
  disabled,
  ...rest
}: SearchFieldProps) {
  const autoId = useId();
  return (
    <div className={cx("ohf-search-field", className)}>
      <SearchIcon />
      <label className="ohf-sr-only" htmlFor={id ?? autoId}>
        {label}
      </label>
      <input
        {...rest}
        id={id ?? autoId}
        type="search"
        value={value}
        disabled={disabled}
        onChange={(e) => onValueChange(e.target.value)}
      />
      {value && (
        <button
          type="button"
          aria-label={clearLabel}
          disabled={disabled}
          onClick={() => onValueChange("")}
        >
          <CloseIcon />
        </button>
      )}
    </div>
  );
}
