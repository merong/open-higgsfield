import { Ref, TextareaHTMLAttributes } from 'react';
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
    invalid?: boolean;
    ref?: Ref<HTMLTextAreaElement>;
}
export declare function Textarea({ invalid, className, ...rest }: TextareaProps): import("react").JSX.Element;
