import { ReactNode } from 'react';
export interface BriefBarProps {
    label: ReactNode;
    topic: ReactNode;
    pills?: ReactNode;
    action?: ReactNode;
    className?: string;
}
export declare function BriefBar({ label, topic, pills, action, className }: BriefBarProps): import("react").JSX.Element;
