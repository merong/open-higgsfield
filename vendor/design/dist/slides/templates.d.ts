import { ReactNode } from 'react';
export interface CoverSlideProps {
    kicker?: ReactNode;
    title: ReactNode;
    sub?: ReactNode;
    titleSize?: "md" | "lg";
}
export declare function CoverSlide({ kicker, title, sub, titleSize, }: CoverSlideProps): import("react").JSX.Element;
export interface BodySlideProps {
    title: ReactNode;
    body: ReactNode;
}
export declare function BodySlide({ title, body }: BodySlideProps): import("react").JSX.Element;
export interface ListSlideProps {
    title: ReactNode;
    items: readonly {
        label: ReactNode;
        value?: ReactNode;
    }[];
    numbered?: boolean;
}
export declare function ListSlide({ title, items, numbered }: ListSlideProps): import("react").JSX.Element;
export interface QuoteSlideProps {
    quote: ReactNode;
    source?: ReactNode;
}
export declare function QuoteSlide({ quote, source }: QuoteSlideProps): import("react").JSX.Element;
export interface CtaSlideProps {
    title: ReactNode;
    sub?: ReactNode;
    pill?: ReactNode;
}
export declare function CtaSlide({ title, sub, pill }: CtaSlideProps): import("react").JSX.Element;
export interface MetricSlideProps {
    value: ReactNode;
    unit?: ReactNode;
    title: ReactNode;
    detail?: ReactNode;
}
export declare function MetricSlide({ value, unit, title, detail }: MetricSlideProps): import("react").JSX.Element;
export interface CompareSlideProps {
    title: ReactNode;
    columns: readonly {
        label: ReactNode;
        body: ReactNode;
    }[];
}
export declare function CompareSlide({ title, columns }: CompareSlideProps): import("react").JSX.Element;
