import type { DappStatus } from "./dapp";

export const DappAction = {
    Edit: "edit",
    AdminEdit: "adminEdit",
    ChangeOwner: "changeOwner",
    Approve: "approve",
    Reject: "reject",
    ApproveChange: "approveChange",
    RejectChange: "rejectChange",
    Remove: "remove",
} as const;
export type DappAction = (typeof DappAction)[keyof typeof DappAction];

type TransitionErrorCode = "INVALID_TRANSITION" | "NO_PENDING_CHANGE";

type TransitionResult = { ok: true; next: DappStatus } | { ok: false; code: TransitionErrorCode };

const TRANSITIONS: Record<DappStatus, Partial<Record<DappAction, DappStatus>>> = {
    pending: { edit: "pending", adminEdit: "pending", changeOwner: "pending", approve: "approved", reject: "rejected", remove: "removed" },
    approved: {
        edit: "approved",
        adminEdit: "approved",
        changeOwner: "approved",
        approveChange: "approved",
        rejectChange: "approved",
        remove: "removed",
    },
    rejected: { edit: "pending", adminEdit: "rejected", changeOwner: "rejected", remove: "removed" },
    removed: {},
};

export function transition(state: { status: DappStatus; hasPendingChange: boolean }, action: DappAction): TransitionResult {
    const next = TRANSITIONS[state.status][action];
    if (next === undefined) return { ok: false, code: "INVALID_TRANSITION" };
    if (state.status === "approved" && action === "adminEdit" && state.hasPendingChange) return { ok: false, code: "INVALID_TRANSITION" };
    if ((action === "approveChange" || action === "rejectChange") && !state.hasPendingChange)
        return { ok: false, code: "NO_PENDING_CHANGE" };
    return { ok: true, next };
}
