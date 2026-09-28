export interface SliderProps {
    min: number;
    max: number;
    step?: number;
    value: number;
    onChange: (next: number) => void;
    "aria-label": string;
    className?: string;
}
export declare function Slider({ min, max, step, value, onChange, className, "aria-label": ariaLabel }: SliderProps): import("react").JSX.Element;
