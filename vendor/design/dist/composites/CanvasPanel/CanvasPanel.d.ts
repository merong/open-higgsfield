import { ReactNode } from 'react';
import { SegmentProps } from '../../components/Segment';
export interface CanvasPanelProps {
    mode: SegmentProps;
    index: number;
    total: number;
    onPrev: () => void;
    onNext: () => void;
    prevLabel: string;
    nextLabel: string;
    stage: ReactNode;
    templates?: {
        label: ReactNode;
        chips: ReactNode;
    };
    options?: {
        label: ReactNode;
        pills: ReactNode;
    };
    actions?: ReactNode;
    hint?: ReactNode;
    inspector?: ReactNode;
    className?: string;
}
export declare function CanvasPanel({ mode, index, total, onPrev, onNext, prevLabel, nextLabel, stage, templates, options, actions, hint, inspector, className, }: CanvasPanelProps): import("react").JSX.Element;
