import { HTMLAttributes, ReactNode } from 'react';
export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
    icon?: ReactNode;
    action?: ReactNode;
    children: ReactNode;
}
export declare function Alert({ icon, action, className, children, ...rest }: AlertProps): import("react").JSX.Element;
