import { ReactNode } from 'react';
export interface InspectorSectionProps {
    title: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    defaultOpen?: boolean;
}
export declare function InspectorSection({ title, description, children, defaultOpen, }: InspectorSectionProps): import("react").JSX.Element;
