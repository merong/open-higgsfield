import { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
export interface ChipProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
    pressed?: boolean;
    dot?: boolean;
    ratio?: string;
    children: ReactNode;
    ref?: Ref<HTMLButtonElement>;
}
export declare function Chip({ pressed, dot, ratio, className, type, children, ...rest }: ChipProps): import("react").JSX.Element;
