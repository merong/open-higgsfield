import { HTMLAttributes, ReactNode } from 'react';
export interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
    label?: ReactNode;
    clock?: ReactNode;
    ratio?: string;
}
export declare function Skeleton({ label, clock, ratio, className, style, ...rest }: SkeletonProps): import("react").JSX.Element;
