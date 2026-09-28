import { ButtonHTMLAttributes, HTMLAttributes, ReactNode, Ref } from 'react';
export type PopoverVariant = "setting" | "list" | "picker" | "menu" | "assets";
export interface PopoverProps extends HTMLAttributes<HTMLDivElement> {
    variant: PopoverVariant;
    placement?: "up" | "down" | "static";
    head?: ReactNode;
    x?: number;
    y?: number;
    ref?: Ref<HTMLDivElement>;
}
export declare function Popover({ variant, placement, head, x, y, className, style, children, ...rest }: PopoverProps): import("react").JSX.Element;
export declare function Menu({ className, ...rest }: HTMLAttributes<HTMLDivElement>): import("react").JSX.Element;
export interface MenuRowProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
    icon?: ReactNode;
    label: ReactNode;
    count?: ReactNode;
    ref?: Ref<HTMLButtonElement>;
}
export declare function MenuRow({ icon, label, count, className, type, ...rest }: MenuRowProps): import("react").JSX.Element;
