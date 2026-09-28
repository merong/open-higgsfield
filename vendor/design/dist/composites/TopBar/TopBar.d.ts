import { ReactNode } from 'react';
import { SegmentProps } from '../../components/Segment';
export interface TopBarProps {
    brand: ReactNode;
    brandHref?: string;
    brandLabel: string;
    nav: SegmentProps;
    credits?: number;
    creditsUnit?: ReactNode;
    topUp?: ReactNode;
    avatar?: ReactNode;
    className?: string;
}
export declare function TopBar({ brand, brandHref, brandLabel, nav, credits, creditsUnit, topUp, avatar, className }: TopBarProps): import("react").JSX.Element;
