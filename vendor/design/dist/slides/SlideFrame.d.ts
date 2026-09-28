import { HTMLAttributes, ReactNode } from 'react';
import { SlidePreset } from './styles';
export type SlideRatio = "4:5" | "3:4" | "1:1" | "9:16";
export type SlideComposition = "full" | "split" | "inset";
export type SlidePosition = "start" | "mid" | "end";
export interface SlideFrameProps extends HTMLAttributes<HTMLDivElement> {
    preset: SlidePreset;
    ratio?: SlideRatio;
    image?: string;
    composition?: SlideComposition;
    imagePosition?: string;
    edition?: ReactNode;
    dim?: number | "grad";
    handle?: ReactNode;
    page?: ReactNode;
    showFooter?: boolean;
    position?: SlidePosition;
    children: ReactNode;
}
export declare function SlideFrame({ preset, ratio, image, dim, composition, imagePosition, edition, handle, page, showFooter, position, className, style, children, ...rest }: SlideFrameProps): import("react").JSX.Element;
