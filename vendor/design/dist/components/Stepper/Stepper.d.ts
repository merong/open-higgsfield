import { ReactNode } from 'react';
export interface StepperProps {
    value: number;
    min: number;
    max: number;
    onChange: (next: number) => void;
    suffix?: ReactNode;
    decrementLabel: string;
    incrementLabel: string;
    className?: string;
}
export declare function Stepper({ value, min, max, onChange, suffix, decrementLabel, incrementLabel, className }: StepperProps): import("react").JSX.Element;
