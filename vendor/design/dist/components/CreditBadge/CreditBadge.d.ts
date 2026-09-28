import { HTMLAttributes, ReactNode } from 'react';
export interface CreditBadgeProps extends HTMLAttributes<HTMLSpanElement> {
    amount: number;
    unit?: ReactNode;
    icon?: ReactNode;
    locale?: string;
}
export declare function CreditBadge({ amount, unit, icon, locale, className, ...rest }: CreditBadgeProps): import("react").JSX.Element;
