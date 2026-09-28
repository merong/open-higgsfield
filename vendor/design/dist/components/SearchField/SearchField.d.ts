import { InputHTMLAttributes } from 'react';
export interface SearchFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
    value: string;
    onValueChange: (value: string) => void;
    label: string;
    clearLabel: string;
}
export declare function SearchField({ value, onValueChange, label, clearLabel, className, id, disabled, ...rest }: SearchFieldProps): import("react").JSX.Element;
