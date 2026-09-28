import { ReactNode } from 'react';
export interface EmptyStateProps {
    icon?: ReactNode;
    title: ReactNode;
    description: ReactNode;
    action?: ReactNode;
    className?: string;
}
export declare function EmptyState({ icon, title, description, action, className, }: EmptyStateProps): import("react").JSX.Element;
