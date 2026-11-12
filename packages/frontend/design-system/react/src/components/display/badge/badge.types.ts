import { ReactNode } from "react";

export type BadgeTone = "warning" | "success" | "danger" | "neutral" | "info";

export type BadgeProps = {
    tone: BadgeTone;
    children: ReactNode;
};
