import { ButtonHTMLAttributes } from 'react';
export interface SwitchProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "onChange" | "type" | "aria-label" | "children"> {
    checked: boolean;
    onChange: (next: boolean) => void;
    "aria-label": string;
    disabled?: boolean;
    className?: string;
}
export declare function Switch({ checked, onChange, disabled, className, "aria-label": ariaLabel, ...rest }: SwitchProps): import("react").JSX.Element;
