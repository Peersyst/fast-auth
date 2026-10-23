import { useEffect, useRef, useState } from "react";
import { Button } from "./Button";
import { CopyIcon } from "./icons";

const OUTCOME_TEXT = { copied: "Copied", failed: "Copy failed" } as const;

export function CopyButton({ value, label, className }: { value: string; label: string; className?: string }) {
    const [outcome, setOutcome] = useState<keyof typeof OUTCOME_TEXT>();
    const reset = useRef<number>();
    useEffect(() => () => window.clearTimeout(reset.current), []);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(value);
            setOutcome("copied");
        } catch {
            setOutcome("failed");
        }
        window.clearTimeout(reset.current);
        reset.current = window.setTimeout(() => setOutcome(undefined), 2000);
    };

    const status = outcome && OUTCOME_TEXT[outcome];
    return (
        <Button variant="secondary" size="small" className={className} aria-label={status ?? label} onClick={() => void copy()}>
            <CopyIcon />
            <span aria-live="polite">{status ?? "Copy"}</span>
        </Button>
    );
}
