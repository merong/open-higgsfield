import { ReactNode } from 'react';
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
    plate?: boolean;
    "aria-label": string;
    className?: string;
}
export declare function Segment({ items, value, onChange, size, plate, className, "aria-label": ariaLabel, }: SegmentProps): import("react").JSX.Element;
