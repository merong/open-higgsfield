import { ReactNode } from 'react';
export interface ActionStripProps {
    status?: ReactNode;
    actions?: ReactNode;
    notice?: ReactNode;
    className?: string;
}
export declare function ActionStrip({ status, actions, notice, className }: ActionStripProps): import("react").JSX.Element;
