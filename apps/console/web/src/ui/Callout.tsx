import type { ReactNode } from "react";
import { cn } from "../lib/cn";

const TONES = { warning: "border-warning-border bg-warning-bg", error: "border-danger-border bg-danger-bg" } as const;

type CalloutProps = {
    tone: "warning" | "error";
    id?: string;
    title: string;
    children: ReactNode;
};

export function Callout({ tone, id, title, children }: CalloutProps) {
    return (
        <div
            id={id}
            className={cn("grid gap-1 rounded-sm border-l-4 px-4 py-3 text-ink", TONES[tone])}
            role={tone === "error" ? "alert" : undefined}
        >
            <p className="font-semibold">{title}</p>
            {children}
        </div>
    );
}
