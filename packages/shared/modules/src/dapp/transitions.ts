import { DappAction, DappStatus } from "./types";

type TransitionErrorCode = "INVALID_TRANSITION" | "NO_PENDING_CHANGE";

type TransitionResult = { ok: true; next: DappStatus } | { ok: false; code: TransitionErrorCode };

const TRANSITIONS: Record<DappStatus, Partial<Record<DappAction, DappStatus>>> = {
    [DappStatus.PENDING]: {
        [DappAction.EDIT]: DappStatus.PENDING,
        [DappAction.ADMIN_EDIT]: DappStatus.PENDING,
        [DappAction.CHANGE_OWNER]: DappStatus.PENDING,
        [DappAction.APPROVE]: DappStatus.APPROVED,
        [DappAction.REJECT]: DappStatus.REJECTED,
        [DappAction.REMOVE]: DappStatus.REMOVED,
    },
    [DappStatus.APPROVED]: {
        [DappAction.EDIT]: DappStatus.APPROVED,
        [DappAction.ADMIN_EDIT]: DappStatus.APPROVED,
        [DappAction.CHANGE_OWNER]: DappStatus.APPROVED,
        [DappAction.APPROVE_CHANGE]: DappStatus.APPROVED,
        [DappAction.REJECT_CHANGE]: DappStatus.APPROVED,
        [DappAction.REMOVE]: DappStatus.REMOVED,
    },
    [DappStatus.REJECTED]: {
        [DappAction.EDIT]: DappStatus.PENDING,
        [DappAction.ADMIN_EDIT]: DappStatus.REJECTED,
        [DappAction.CHANGE_OWNER]: DappStatus.REJECTED,
        [DappAction.REMOVE]: DappStatus.REMOVED,
    },
    [DappStatus.REMOVED]: {},
};

/**
 * Gives the status an action leads to, or why the lifecycle refuses it.
 * @param state The dApp's status and whether it has a pending change.
 * @param action The action to take.
 * @returns The next status, or the error code.
 */
export function transition(state: { status: DappStatus; hasPendingChange: boolean }, action: DappAction): TransitionResult {
    const next = TRANSITIONS[state.status][action];
    if (next === undefined) return { ok: false, code: "INVALID_TRANSITION" };
    if (state.status === DappStatus.APPROVED && action === DappAction.ADMIN_EDIT && state.hasPendingChange)
        return { ok: false, code: "INVALID_TRANSITION" };
    if ((action === DappAction.APPROVE_CHANGE || action === DappAction.REJECT_CHANGE) && !state.hasPendingChange)
        return { ok: false, code: "NO_PENDING_CHANGE" };
    return { ok: true, next };
}
