export type CopyButtonProps = {
    value: string;
    /**
     * The button's accessible name before anything is copied.
     */
    label: string;
    /**
     * The visible text before anything is copied.
     */
    copyText: string;
    copiedText: string;
    failedText: string;
    className?: string;
};
