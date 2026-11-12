import { withSessionRenewal } from "../../../../src/data-access/api";
import { MeMock } from "@shared/console/test/mocks/auth";
import { createApiErrorMock } from "@shared/console/test/mocks/common";

describe("withSessionRenewal", () => {
    const me = new MeMock();
    const renewSession = jest.fn<Promise<void>, []>();
    const api = { me: jest.fn() };
    const renewing = withSessionRenewal(api, renewSession);

    beforeEach(() => {
        renewSession.mockReset().mockResolvedValue();
        api.me.mockReset();
    });

    it("should answer without renewing when the first attempt succeeds", async () => {
        api.me.mockResolvedValueOnce(me);

        await expect(renewing.me()).resolves.toBe(me);
        expect(renewSession).not.toHaveBeenCalled();
    });

    it("should renew the session and send the request once more after a 401", async () => {
        api.me.mockRejectedValueOnce(createApiErrorMock(401, "UNAUTHENTICATED")).mockResolvedValueOnce(me);

        await expect(renewing.me()).resolves.toBe(me);
        expect(renewSession).toHaveBeenCalledTimes(1);
        expect(api.me).toHaveBeenCalledTimes(2);
    });

    it("should pass on a second 401 without renewing again", async () => {
        const second = createApiErrorMock(401, "UNAUTHENTICATED");
        api.me.mockRejectedValueOnce(createApiErrorMock(401, "UNAUTHENTICATED")).mockRejectedValueOnce(second);

        await expect(renewing.me()).rejects.toBe(second);
        expect(renewSession).toHaveBeenCalledTimes(1);
        expect(api.me).toHaveBeenCalledTimes(2);
    });

    it("should pass on a failed renewal without retrying", async () => {
        const ended = new Error("Session ended");
        api.me.mockRejectedValueOnce(createApiErrorMock(401, "UNAUTHENTICATED"));
        renewSession.mockRejectedValueOnce(ended);

        await expect(renewing.me()).rejects.toBe(ended);
        expect(api.me).toHaveBeenCalledTimes(1);
    });

    it("should pass on any other error without renewing", async () => {
        const forbidden = createApiErrorMock(403, "EMAIL_NOT_VERIFIED");
        api.me.mockRejectedValueOnce(forbidden);

        await expect(renewing.me()).rejects.toBe(forbidden);
        expect(renewSession).not.toHaveBeenCalled();
    });

    it("should send the call's arguments on both attempts", async () => {
        const remove = jest.fn().mockRejectedValueOnce(createApiErrorMock(401, "UNAUTHENTICATED")).mockResolvedValueOnce(undefined);

        await withSessionRenewal({ remove }, renewSession).remove("dapp-1", 3);

        expect(remove.mock.calls).toEqual([
            ["dapp-1", 3],
            ["dapp-1", 3],
        ]);
    });
});
