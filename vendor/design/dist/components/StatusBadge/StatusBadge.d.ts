import { HTMLAttributes } from 'react';
export interface StatusBadgeProps extends HTMLAttributes<HTMLSpanElement> {
    tone?: "neutral" | "success" | "warning" | "danger" | "live" | "info";
}
export declare function StatusBadge({ tone, className, children, ...rest }: StatusBadgeProps): import("react").JSX.Element;
