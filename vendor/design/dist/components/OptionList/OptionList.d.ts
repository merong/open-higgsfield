export interface OptionListProps {
    options: readonly {
        value: string;
        label: string;
    }[];
    value: string;
    onChange: (next: string) => void;
    ratio?: boolean;
}
/** The values of one enum, listed down a single column. */
export declare function OptionList({ options, value, onChange, ratio }: OptionListProps): import("react").JSX.Element;
