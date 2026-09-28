import { ButtonHTMLAttributes } from 'react';
export interface TimelineClipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    label: string;
    duration: string;
    thumbnail?: string;
    selected?: boolean;
}
export declare function TimelineClip({ label, duration, thumbnail, selected, className, ...rest }: TimelineClipProps): import("react").JSX.Element;
