import { HTMLAttributes, ReactNode, Ref } from 'react';
export type ButtonVariant = "primary" | "secondary" | "model" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";
export interface ButtonProps extends Omit<HTMLAttributes<HTMLElement>, "children"> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    icon?: ReactNode;
    kbd?: string;
    busy?: boolean;
    loading?: boolean;
    disabled?: boolean;
    href?: string;
    type?: "button" | "submit" | "reset";
    children?: ReactNode;
    ref?: Ref<HTMLElement>;
}
export declare function Button({ variant, size, icon, kbd, busy, loading, disabled, href, type, className, children, ref, ...rest }: ButtonProps): import("react").JSX.Element;
