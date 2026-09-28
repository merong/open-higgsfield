export interface PaginationProps {
    page: number;
    total: number;
    onPageChange: (page: number) => void;
    label: string;
    previousLabel: string;
    nextLabel: string;
}
export declare function Pagination({ page, total, onPageChange, label, previousLabel, nextLabel, }: PaginationProps): import("react").JSX.Element;
