import type { DappStatus } from "../../api/client";
import { Badge, type BadgeTone } from "../../ui/Badge";

export const STATUS_BADGES: Record<DappStatus | "change-under-review", { label: string; tone: BadgeTone }> = {
    pending: { label: "Pending", tone: "warning" },
    approved: { label: "Approved", tone: "success" },
    rejected: { label: "Rejected", tone: "danger" },
    removed: { label: "Removed", tone: "neutral" },
    "change-under-review": { label: "Change under review", tone: "info" },
};

export function StatusBadge({ status }: { status: keyof typeof STATUS_BADGES }) {
    const { tone, label } = STATUS_BADGES[status];
    return <Badge tone={tone}>{label}</Badge>;
}
