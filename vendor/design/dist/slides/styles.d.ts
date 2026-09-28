export type SlidePreset = "basic" | "editorial" | "impact" | "soft";
export interface SlideStyle {
    bg: string;
    tx: string;
    acc: string;
    accInk: string;
    rule: string;
    head: {
        family: string;
        weight: number;
        letterSpacing: string;
        lineHeight: number;
    };
    body: {
        family: string;
    };
}
export declare const SLIDE_STYLES: Record<SlidePreset, SlideStyle>;
export declare const SLIDE_PRESETS: SlidePreset[];
