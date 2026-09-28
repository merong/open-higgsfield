import { ButtonHTMLAttributes, ReactNode } from 'react';
export interface FormatCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "name"> {
    icon: ReactNode;
    name: ReactNode;
    description: ReactNode;
    pressed?: boolean;
    soon?: ReactNode;
}
export declare function FormatCard({ icon, name, description, pressed, soon, className, type, disabled, ...rest }: FormatCardProps): import("react").JSX.Element;
