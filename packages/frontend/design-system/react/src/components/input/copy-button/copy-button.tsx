import { useEffect, useRef, useState } from "react";
import { CopyIcon } from "../../icons";
import { Button } from "../button";
import { CopyButtonProps } from "./copy-button.types";

type CopyOutcome = "copied" | "failed";

const OUTCOME_DURATION_MS = 2000;

export function CopyButton({ value, label, copyText, copiedText, failedText, className }: CopyButtonProps): React.JSX.Element {
    const [outcome, setOutcome] = useState<CopyOutcome>();
    const reset = useRef<number | undefined>(undefined);
    useEffect(() => () => window.clearTimeout(reset.current), []);

    const copy = async (): Promise<void> => {
        try {
            await navigator.clipboard.writeText(value);
            setOutcome("copied");
        } catch {
            setOutcome("failed");
        }
        window.clearTimeout(reset.current);
        reset.current = window.setTimeout(() => setOutcome(undefined), OUTCOME_DURATION_MS);
    };

    const status = outcome && { copied: copiedText, failed: failedText }[outcome];
    return (
        <Button variant="secondary" size="small" className={className} aria-label={status ?? label} onClick={() => void copy()}>
            <CopyIcon />
            <span aria-live="polite">{status ?? copyText}</span>
        </Button>
    );
}
