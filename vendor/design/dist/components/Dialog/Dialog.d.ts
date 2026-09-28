import { ReactNode } from 'react';
export interface DialogProps {
    open: boolean;
    title: ReactNode;
    onClose: () => void;
    width?: number;
    closeLabel: string;
    head?: ReactNode;
    inline?: boolean;
    children: ReactNode;
    className?: string;
}
export declare function Dialog({ open, title, onClose, width, closeLabel, head, inline, children, className, }: DialogProps): import("react").JSX.Element | null;
