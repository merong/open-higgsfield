import { ReactNode } from 'react';
export interface ProjectCardProps {
    href?: string;
    onClick?: () => void;
    deck: ReactNode;
    cover?: ReactNode;
    title: ReactNode;
    meta: ReactNode;
    status?: ReactNode;
    statusTone?: "done" | "live" | "draft";
    className?: string;
}
export declare function ProjectCard({ href, onClick, deck, cover, title, meta, status, statusTone, className, }: ProjectCardProps): import("react").JSX.Element;
