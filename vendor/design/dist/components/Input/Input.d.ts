import { InputHTMLAttributes, Ref } from 'react';
export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    invalid?: boolean;
    ref?: Ref<HTMLInputElement>;
}
export declare function Input({ invalid, className, ...rest }: InputProps): import("react").JSX.Element;
