import { ButtonHTMLAttributes, ReactNode, Ref } from 'react';
export interface PillProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "value"> {
    glyph?: ReactNode;
    label?: ReactNode;
    value: ReactNode;
    expanded?: boolean;
    caret?: boolean;
    ref?: Ref<HTMLButtonElement>;
}
export declare function Pill({ glyph, label, value, expanded, caret, className, type, ...rest }: PillProps): import("react").JSX.Element;
