export interface ProgressProps {
    value?: number;
    max?: number;
    label: string;
    detail?: string;
    tone?: "default" | "danger";
    className?: string;
}
export declare function Progress({ value, max, label, detail, tone, className, }: ProgressProps): import("react").JSX.Element;
