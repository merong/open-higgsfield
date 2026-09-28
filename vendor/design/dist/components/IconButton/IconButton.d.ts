import { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
export type IconButtonSize = 28 | 30 | 36;
export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "aria-label"> {
    icon: ReactNode;
    "aria-label": string;
    size?: IconButtonSize;
    ghost?: boolean;
    spin?: boolean;
    ref?: Ref<HTMLButtonElement>;
}
export declare function IconButton({ icon, size, ghost, spin, className, type, ...rest }: IconButtonProps): import("react").JSX.Element;
