import { HTMLAttributes, ReactNode } from 'react';
import { ThumbProps } from '../../components/Thumb';
export interface StoryboardRowProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
    index: number;
    thumb: ThumbProps;
    tag?: ReactNode;
    title: ReactNode;
    sub?: ReactNode;
    counter?: {
        value: number;
        max: number;
    };
    prompt?: ReactNode;
    promptIcon?: ReactNode;
    status?: ReactNode;
    statusTone?: "default" | "live" | "danger";
    statusAction?: ReactNode;
    actions?: ReactNode;
    selected?: boolean;
    editing?: boolean;
    dragging?: boolean;
    onSelect?: () => void;
}
export declare function StoryboardRow({ index, thumb, tag, title, sub, counter, prompt, promptIcon, status, statusTone, statusAction, actions, selected, editing, dragging, onSelect, className, ...rest }: StoryboardRowProps): import("react").JSX.Element;
