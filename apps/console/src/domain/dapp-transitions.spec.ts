import { DappStatus } from "./dapp";
import { DappAction, transition } from "./dapp-transitions";

const LEGAL_MOVES: [DappStatus, DappAction, DappStatus][] = [
    ["pending", "edit", "pending"],
    ["pending", "adminEdit", "pending"],
    ["pending", "changeOwner", "pending"],
    ["pending", "approve", "approved"],
    ["pending", "reject", "rejected"],
    ["pending", "remove", "removed"],
    ["approved", "edit", "approved"],
    ["approved", "adminEdit", "approved"],
    ["approved", "changeOwner", "approved"],
    ["approved", "approveChange", "approved"],
    ["approved", "rejectChange", "approved"],
    ["approved", "remove", "removed"],
    ["rejected", "edit", "pending"],
    ["rejected", "adminEdit", "rejected"],
    ["rejected", "changeOwner", "rejected"],
    ["rejected", "remove", "removed"],
];

const ILLEGAL_MOVES: [DappStatus, DappAction][] = Object.values(DappStatus).flatMap((status) =>
    Object.values(DappAction)
        .filter((action) => !LEGAL_MOVES.some(([from, legal]) => from === status && legal === action))
        .map((action): [DappStatus, DappAction] => [status, action]),
);

describe("transition", () => {
    it.each(LEGAL_MOVES)("%s → %s leads to %s", (status, action, next) => {
        const hasPendingChange = action === "approveChange" || action === "rejectChange";
        expect(transition({ status, hasPendingChange }, action)).toEqual({ ok: true, next });
    });

    it.each(ILLEGAL_MOVES)("%s → %s is an invalid transition, with or without a pending change", (status, action) => {
        expect(transition({ status, hasPendingChange: false }, action)).toEqual({ ok: false, code: "INVALID_TRANSITION" });
        expect(transition({ status, hasPendingChange: true }, action)).toEqual({ ok: false, code: "INVALID_TRANSITION" });
    });

    it.each(["approveChange", "rejectChange"] as const)("approved → %s needs a pending change", (action) => {
        expect(transition({ status: "approved", hasPendingChange: false }, action)).toEqual({ ok: false, code: "NO_PENDING_CHANGE" });
    });

    it("refuses an admin edit of an approved dApp while a change is pending", () => {
        expect(transition({ status: "approved", hasPendingChange: true }, "adminEdit")).toEqual({ ok: false, code: "INVALID_TRANSITION" });
    });

    it.each([
        ["pending", "pending"],
        ["rejected", "rejected"],
    ] as const)("%s → adminEdit only looks at a pending change on an approved dApp", (status, next) => {
        expect(transition({ status, hasPendingChange: true }, "adminEdit")).toEqual({ ok: true, next });
    });

    it.each([
        ["edit", "approved"],
        ["changeOwner", "approved"],
        ["remove", "removed"],
    ] as const)("approved → %s is allowed while a change is pending", (action, next) => {
        expect(transition({ status: "approved", hasPendingChange: true }, action)).toEqual({ ok: true, next });
    });
});
