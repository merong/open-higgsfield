import { ButtonHTMLAttributes, ReactNode } from 'react';
export interface StyleCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "name"> {
    preview: ReactNode;
    name: ReactNode;
    description: ReactNode;
    pressed?: boolean;
}
export declare function StyleCard({ preview, name, description, pressed, className, type, ...rest }: StyleCardProps): import("react").JSX.Element;
