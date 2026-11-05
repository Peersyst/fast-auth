import { ReactNode } from "react";

export type CalloutTone = "info" | "tip" | "warning" | "error";

export type CalloutProps = {
    tone: CalloutTone;
    id?: string;
    title?: ReactNode;
    children: ReactNode;
    className?: string;
};
