import { HTMLAttributes, ReactNode } from 'react';
export type ThumbState = "image" | "pending" | "failed" | "empty" | "flat";
export interface ThumbProps extends HTMLAttributes<HTMLDivElement> {
    state: ThumbState;
    src?: string;
    alt?: string;
    size?: number;
    ratio?: string;
    flatColor?: string;
    flatAccent?: string;
    icon?: ReactNode;
}
export declare function Thumb({ state, src, alt, size, ratio, flatColor, flatAccent, icon, className, style, ...rest }: ThumbProps): import("react").JSX.Element;
