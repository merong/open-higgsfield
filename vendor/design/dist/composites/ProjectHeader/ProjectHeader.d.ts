import { ReactNode } from 'react';
export interface ProjectHeaderProps {
    back: {
        href?: string;
        onClick?: () => void;
        label: string;
    };
    title: ReactNode;
    tags?: ReactNode;
    status?: ReactNode;
    actions?: ReactNode;
    className?: string;
}
export declare function ProjectHeader({ back, title, tags, status, actions, className }: ProjectHeaderProps): import("react").JSX.Element;
