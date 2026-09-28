import { ReactNode } from 'react';
export interface FieldProps {
    label: ReactNode;
    hint?: ReactNode;
    required?: ReactNode;
    optional?: ReactNode;
    counter?: {
        value: number;
        max: number;
    };
    error?: ReactNode;
    value?: ReactNode;
    htmlFor?: string;
    children: ReactNode;
    className?: string;
}
export declare function Field({ label, hint, required, optional, counter, error, value, htmlFor, children, className }: FieldProps): import("react").JSX.Element;
