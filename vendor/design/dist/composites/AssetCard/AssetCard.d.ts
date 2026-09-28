import { ButtonHTMLAttributes } from 'react';
export interface AssetCardProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
    src?: string;
    title: string;
    meta?: string;
    selected?: boolean;
}
export declare function AssetCard({ src, title, meta, selected, className, ...rest }: AssetCardProps): import("react").JSX.Element;
