import { HTMLAttributes, ReactNode } from 'react';
export type TagTone = "default" | "accent" | "muted";
export interface TagProps extends HTMLAttributes<HTMLSpanElement> {
    tone?: TagTone;
    children: ReactNode;
}
export declare function Tag({ tone, className, children, ...rest }: TagProps): import("react").JSX.Element;
