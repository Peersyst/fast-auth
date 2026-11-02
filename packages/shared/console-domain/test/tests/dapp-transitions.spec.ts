import { DappStatus } from "../../src/dapp";
import { DappAction, transition } from "../../src/dapp-transitions";

const LEGAL_MOVES: [DappStatus, DappAction, DappStatus][] = [
    [DappStatus.PENDING, DappAction.EDIT, DappStatus.PENDING],
    [DappStatus.PENDING, DappAction.ADMIN_EDIT, DappStatus.PENDING],
    [DappStatus.PENDING, DappAction.CHANGE_OWNER, DappStatus.PENDING],
    [DappStatus.PENDING, DappAction.APPROVE, DappStatus.APPROVED],
    [DappStatus.PENDING, DappAction.REJECT, DappStatus.REJECTED],
    [DappStatus.PENDING, DappAction.REMOVE, DappStatus.REMOVED],
    [DappStatus.APPROVED, DappAction.EDIT, DappStatus.APPROVED],
    [DappStatus.APPROVED, DappAction.ADMIN_EDIT, DappStatus.APPROVED],
    [DappStatus.APPROVED, DappAction.CHANGE_OWNER, DappStatus.APPROVED],
    [DappStatus.APPROVED, DappAction.APPROVE_CHANGE, DappStatus.APPROVED],
    [DappStatus.APPROVED, DappAction.REJECT_CHANGE, DappStatus.APPROVED],
    [DappStatus.APPROVED, DappAction.REMOVE, DappStatus.REMOVED],
    [DappStatus.REJECTED, DappAction.EDIT, DappStatus.PENDING],
    [DappStatus.REJECTED, DappAction.ADMIN_EDIT, DappStatus.REJECTED],
    [DappStatus.REJECTED, DappAction.CHANGE_OWNER, DappStatus.REJECTED],
    [DappStatus.REJECTED, DappAction.REMOVE, DappStatus.REMOVED],
];

const ILLEGAL_MOVES: [DappStatus, DappAction][] = Object.values(DappStatus).flatMap((status) =>
    Object.values(DappAction)
        .filter((action) => !LEGAL_MOVES.some(([from, legal]) => from === status && legal === action))
        .map((action): [DappStatus, DappAction] => [status, action]),
);

describe("transition", () => {
    it.each(LEGAL_MOVES)("should make %s → %s lead to %s", (status, action, next) => {
        const hasPendingChange = action === DappAction.APPROVE_CHANGE || action === DappAction.REJECT_CHANGE;
        expect(transition({ status, hasPendingChange }, action)).toEqual({ ok: true, next });
    });

    it.each(ILLEGAL_MOVES)("should refuse %s → %s as an invalid transition, with or without a pending change", (status, action) => {
        expect(transition({ status, hasPendingChange: false }, action)).toEqual({ ok: false, code: "INVALID_TRANSITION" });
        expect(transition({ status, hasPendingChange: true }, action)).toEqual({ ok: false, code: "INVALID_TRANSITION" });
    });

    it.each([DappAction.APPROVE_CHANGE, DappAction.REJECT_CHANGE] as const)(
        "should require a pending change for approved → %s",
        (action) => {
            expect(transition({ status: DappStatus.APPROVED, hasPendingChange: false }, action)).toEqual({
                ok: false,
                code: "NO_PENDING_CHANGE",
            });
        },
    );

    it("should refuse an admin edit of an approved dApp while a change is pending", () => {
        expect(transition({ status: DappStatus.APPROVED, hasPendingChange: true }, DappAction.ADMIN_EDIT)).toEqual({
            ok: false,
            code: "INVALID_TRANSITION",
        });
    });

    it.each([
        [DappStatus.PENDING, DappStatus.PENDING],
        [DappStatus.REJECTED, DappStatus.REJECTED],
    ] as const)("should only look at a pending change on an approved dApp for %s → adminEdit", (status, next) => {
        expect(transition({ status, hasPendingChange: true }, DappAction.ADMIN_EDIT)).toEqual({ ok: true, next });
    });

    it.each([
        [DappAction.EDIT, DappStatus.APPROVED],
        [DappAction.CHANGE_OWNER, DappStatus.APPROVED],
        [DappAction.REMOVE, DappStatus.REMOVED],
    ] as const)("should allow approved → %s while a change is pending", (action, next) => {
        expect(transition({ status: DappStatus.APPROVED, hasPendingChange: true }, action)).toEqual({ ok: true, next });
    });
});
