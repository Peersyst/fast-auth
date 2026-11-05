import { DappAction, DappStatus, transition } from "../../../src/dapp";

describe("transition", () => {
    it.each([
        [DappStatus.PENDING, DappAction.EDIT, DappStatus.PENDING],
        [DappStatus.PENDING, DappAction.ADMIN_EDIT, DappStatus.PENDING],
        [DappStatus.PENDING, DappAction.CHANGE_OWNER, DappStatus.PENDING],
        [DappStatus.PENDING, DappAction.APPROVE, DappStatus.APPROVED],
        [DappStatus.PENDING, DappAction.REJECT, DappStatus.REJECTED],
        [DappStatus.PENDING, DappAction.REMOVE, DappStatus.REMOVED],
        [DappStatus.APPROVED, DappAction.EDIT, DappStatus.APPROVED],
        [DappStatus.APPROVED, DappAction.ADMIN_EDIT, DappStatus.APPROVED],
        [DappStatus.APPROVED, DappAction.CHANGE_OWNER, DappStatus.APPROVED],
        [DappStatus.APPROVED, DappAction.REMOVE, DappStatus.REMOVED],
        [DappStatus.REJECTED, DappAction.EDIT, DappStatus.PENDING],
        [DappStatus.REJECTED, DappAction.ADMIN_EDIT, DappStatus.REJECTED],
        [DappStatus.REJECTED, DappAction.CHANGE_OWNER, DappStatus.REJECTED],
        [DappStatus.REJECTED, DappAction.REMOVE, DappStatus.REMOVED],
    ])("should move a %s dApp on %s to %s", (status, action, next) => {
        expect(transition({ status, hasPendingChange: false }, action)).toEqual({ ok: true, next });
    });

    it.each([DappAction.APPROVE_CHANGE, DappAction.REJECT_CHANGE])(
        "should allow %s on an approved dApp with a pending change",
        (action) => {
            expect(transition({ status: DappStatus.APPROVED, hasPendingChange: true }, action)).toEqual({
                ok: true,
                next: DappStatus.APPROVED,
            });
        },
    );

    it.each([DappAction.APPROVE_CHANGE, DappAction.REJECT_CHANGE])("should refuse %s without a pending change", (action) => {
        expect(transition({ status: DappStatus.APPROVED, hasPendingChange: false }, action)).toEqual({
            ok: false,
            code: "NO_PENDING_CHANGE",
        });
    });

    it("should refuse an admin edit while an approved dApp has a pending change", () => {
        expect(transition({ status: DappStatus.APPROVED, hasPendingChange: true }, DappAction.ADMIN_EDIT)).toEqual({
            ok: false,
            code: "INVALID_TRANSITION",
        });
    });

    it.each([
        [DappStatus.PENDING, DappAction.APPROVE_CHANGE],
        [DappStatus.APPROVED, DappAction.APPROVE],
        [DappStatus.APPROVED, DappAction.REJECT],
        [DappStatus.REJECTED, DappAction.APPROVE],
        [DappStatus.REJECTED, DappAction.REJECT_CHANGE],
        ...Object.values(DappAction).map((action): [DappStatus, DappAction] => [DappStatus.REMOVED, action]),
    ])("should refuse a %s dApp the %s action", (status, action) => {
        expect(transition({ status, hasPendingChange: true }, action)).toEqual({ ok: false, code: "INVALID_TRANSITION" });
    });
});
