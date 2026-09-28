import { HTMLAttributes, ReactNode } from 'react';
export interface TooltipProps extends HTMLAttributes<HTMLSpanElement> {
    label: string;
    align?: "start" | "end";
    children: ReactNode;
}
export declare function Tooltip({ label, align, className, children, ...rest }: TooltipProps): import("react").JSX.Element;
