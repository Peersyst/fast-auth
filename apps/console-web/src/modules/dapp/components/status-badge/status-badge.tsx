import { Badge, BadgeTone } from "@frontend/design-system-react/badge";
import { useTranslate } from "@frontend/locale/react";
import { DappStatus } from "@shared/console";

export type StatusBadgeStatus = DappStatus | "changeUnderReview";

export const STATUS_TONES: Record<StatusBadgeStatus, BadgeTone> = {
    pending: "warning",
    approved: "success",
    rejected: "danger",
    removed: "neutral",
    changeUnderReview: "info",
};

export type StatusBadgeProps = {
    status: StatusBadgeStatus;
};

export function StatusBadge({ status }: StatusBadgeProps): React.JSX.Element {
    const translate = useTranslate();
    return <Badge tone={STATUS_TONES[status]}>{translate(`dapp.status.${status}`)}</Badge>;
}
