import { IconButton } from "@/components/IconButton";
import { ChevronLeftIcon, ChevronRightIcon } from "@/icons";
import "./Pagination.scss";
export interface PaginationProps {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
  label: string;
  previousLabel: string;
  nextLabel: string;
}
export function Pagination({
  page,
  total,
  onPageChange,
  label,
  previousLabel,
  nextLabel,
}: PaginationProps) {
  const count = Math.max(0, Math.floor(Number.isFinite(total) ? total : 0));
  const current = count
    ? Math.max(1, Math.min(count, Math.floor(Number.isFinite(page) ? page : 1)))
    : 0;
  return (
    <nav className="ohf-pagination" aria-label={label}>
      <IconButton
        ghost
        icon={<ChevronLeftIcon />}
        aria-label={previousLabel}
        disabled={current <= 1}
        onClick={() => onPageChange(current - 1)}
      />
      <span aria-live="polite">
        {current} <span>/ {count}</span>
      </span>
      <IconButton
        ghost
        icon={<ChevronRightIcon />}
        aria-label={nextLabel}
        disabled={current >= count}
        onClick={() => onPageChange(current + 1)}
      />
    </nav>
  );
}
