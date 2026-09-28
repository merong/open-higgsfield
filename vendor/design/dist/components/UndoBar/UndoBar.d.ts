import { ReactNode } from 'react';
export interface UndoBarProps {
    text: ReactNode;
    actionLabel: ReactNode;
    onAction: () => void;
    durationMs: number;
    icon?: ReactNode;
    className?: string;
}
export declare function UndoBar({ text, actionLabel, onAction, durationMs, icon, className }: UndoBarProps): import("react").JSX.Element;
