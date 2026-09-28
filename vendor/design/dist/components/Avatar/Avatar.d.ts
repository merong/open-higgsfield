import { HTMLAttributes } from 'react';
export interface AvatarProps extends HTMLAttributes<HTMLSpanElement> {
    initials?: string;
    src?: string;
    alt?: string;
    size?: 28 | 32 | 44;
}
export declare function Avatar({ initials, src, alt, size, className, ...rest }: AvatarProps): import("react").JSX.Element;
