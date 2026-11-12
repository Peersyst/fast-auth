import { DomainError } from "@frontend/core/domain/error";
import { UpsertDappRequest } from "@shared/console";
import { ConsoleDappController } from "../../../../src/domain/controllers";
import { ConsoleDappErrors } from "../../../../src/domain/console-dapp.errors";
import { ConsoleDappApiMock } from "../../../mocks/data-access/api";
import { createApiErrorMock } from "@shared/console/test/mocks/common";
import { DAPP_ID_MOCK, OwnerDappMock } from "@shared/console/test/mocks/dapp";

const FIELDS: UpsertDappRequest = {
    name: "Acme Wallet",
    description: "",
    logoUrl: "https://cdn.acme.xyz/logo.png",
    mauBracket: "1k_10k",
    callbackUrls: ["https://app.acme.xyz/callback"],
    logoutUrls: [],
    webOrigins: ["https://app.acme.xyz"],
    contactEmail: "dev@acme.xyz",
};

const CHANGE = {
    name: "Acme Pay",
    description: "A wallet for NEAR.",
    logoUrl: "https://cdn.acme.xyz/pay.png",
    callbackUrls: ["https://app.acme.xyz/callback", "https://app.acme.xyz/silent"],
    logoutUrls: [],
    webOrigins: ["https://app.acme.xyz"],
};

describe("ConsoleDappController", () => {
    const consoleDappApiMock = new ConsoleDappApiMock();

    const controller = new ConsoleDappController(consoleDappApiMock);

    beforeEach(() => {
        consoleDappApiMock.clearMocks();
    });

    describe("getMyDapp", () => {
        it("should return the owner's dApp", async () => {
            const dapp = new OwnerDappMock({ status: "approved", auth0ClientId: "client-abc" });
            consoleDappApiMock.getMine.mockResolvedValueOnce({ dapp });

            await expect(controller.getMyDapp()).resolves.toBe(dapp);
        });

        it("should return null when the owner has no dApp", async () => {
            consoleDappApiMock.getMine.mockResolvedValueOnce({ dapp: null });

            await expect(controller.getMyDapp()).resolves.toBeNull();
        });

        it.each([
            [401, "UNAUTHENTICATED", ConsoleDappErrors.SESSION_EXPIRED],
            [401, "Unauthorized", ConsoleDappErrors.SESSION_EXPIRED],
            [403, "EMAIL_NOT_VERIFIED", ConsoleDappErrors.EMAIL_NOT_VERIFIED],
            [403, "EMAIL_REQUIRED", ConsoleDappErrors.EMAIL_REQUIRED],
            [403, "FORBIDDEN_ROLE", ConsoleDappErrors.FORBIDDEN_ROLE],
            [500, "Internal server error", ConsoleDappErrors.SERVER_ERROR],
        ])("should report a %i %s as %s", async (status, code, error) => {
            consoleDappApiMock.getMine.mockRejectedValueOnce(createApiErrorMock(status, code));

            await expect(controller.getMyDapp()).rejects.toEqual(new DomainError(error));
        });

        it("should report a request that never reached the console as unreachable", async () => {
            consoleDappApiMock.getMine.mockRejectedValueOnce(new TypeError("Failed to fetch"));

            await expect(controller.getMyDapp()).rejects.toEqual(new DomainError(ConsoleDappErrors.CONSOLE_UNREACHABLE));
        });
    });

    describe("submitDapp", () => {
        it("should submit the fields", async () => {
            await expect(controller.submitDapp(FIELDS)).resolves.toEqual(new OwnerDappMock());
            expect(consoleDappApiMock.submit).toHaveBeenCalledWith(FIELDS);
        });

        it("should say when the email already has a dApp", async () => {
            consoleDappApiMock.submit.mockRejectedValueOnce(createApiErrorMock(409, "DAPP_ALREADY_EXISTS"));

            await expect(controller.submitDapp(FIELDS)).rejects.toEqual(new DomainError(ConsoleDappErrors.DAPP_ALREADY_EXISTS));
        });

        it.each([
            ["the OpenAPI validator", "request/body must have required property 'name'"],
            ["the validation pipe", ["name must be a valid dApp name"]],
        ])("should report a value %s refused", async (_, message) => {
            consoleDappApiMock.submit.mockRejectedValueOnce(createApiErrorMock(400, message));

            await expect(controller.submitDapp(FIELDS)).rejects.toEqual(new DomainError(ConsoleDappErrors.VALIDATION_FAILED));
        });
    });

    describe("editDapp", () => {
        it("should save the edit with the version it was made on", async () => {
            const request = { ...FIELDS, expectedVersion: 3 };

            await expect(controller.editDapp({ id: DAPP_ID_MOCK, request })).resolves.toEqual(new OwnerDappMock({ version: 4 }));
            expect(consoleDappApiMock.edit).toHaveBeenCalledWith(DAPP_ID_MOCK, request);
        });

        it.each([
            [409, "DAPP_CHANGED", ConsoleDappErrors.DAPP_CHANGED],
            [404, "DAPP_NOT_FOUND", ConsoleDappErrors.DAPP_NOT_FOUND],
            [409, "INVALID_TRANSITION", ConsoleDappErrors.INVALID_TRANSITION],
            [422, "PROVISIONING_REJECTED", ConsoleDappErrors.PROVISIONING_REJECTED],
            [502, "PROVISIONING_FAILED", ConsoleDappErrors.PROVISIONING_FAILED],
        ])("should report a %i %s as %s", async (status, code, error) => {
            consoleDappApiMock.edit.mockRejectedValueOnce(createApiErrorMock(status, code));

            await expect(controller.editDapp({ id: DAPP_ID_MOCK, request: { ...FIELDS, expectedVersion: 3 } })).rejects.toEqual(
                new DomainError(error),
            );
        });
    });

    describe("withdrawChange", () => {
        it("should save the live fields, not the change, with the version shown", async () => {
            const dapp = new OwnerDappMock({ status: "approved", pendingChange: CHANGE, pendingChangeAt: "2026-10-03T10:00:00Z" });

            await controller.withdrawChange({ dapp, expectedVersion: 3 });

            expect(consoleDappApiMock.edit).toHaveBeenCalledWith(DAPP_ID_MOCK, {
                name: "Acme Wallet",
                description: "A wallet for NEAR.",
                logoUrl: "https://cdn.acme.xyz/logo.png",
                mauBracket: "1k_10k",
                callbackUrls: ["https://app.acme.xyz/callback"],
                logoutUrls: [],
                webOrigins: ["https://app.acme.xyz"],
                contactEmail: "dev@acme.xyz",
                expectedVersion: 3,
            });
        });

        it("should say when the dApp changed since it was shown", async () => {
            consoleDappApiMock.edit.mockRejectedValueOnce(createApiErrorMock(409, "DAPP_CHANGED"));

            await expect(controller.withdrawChange({ dapp: new OwnerDappMock(), expectedVersion: 3 })).rejects.toEqual(
                new DomainError(ConsoleDappErrors.DAPP_CHANGED),
            );
        });
    });

    describe("removeDapp", () => {
        it("should remove the dApp on the version shown", async () => {
            await expect(controller.removeDapp({ id: DAPP_ID_MOCK, expectedVersion: 3 })).resolves.toBeUndefined();
            expect(consoleDappApiMock.remove).toHaveBeenCalledWith(DAPP_ID_MOCK, 3);
        });

        it("should say when the dApp changed since it was shown", async () => {
            consoleDappApiMock.remove.mockRejectedValueOnce(createApiErrorMock(409, "DAPP_CHANGED"));

            await expect(controller.removeDapp({ id: DAPP_ID_MOCK, expectedVersion: 3 })).rejects.toEqual(
                new DomainError(ConsoleDappErrors.DAPP_CHANGED),
            );
        });

        it.each([
            [400, "request/query/expectedVersion must be integer", ConsoleDappErrors.VALIDATION_FAILED],
            [404, "not found", ConsoleDappErrors.SERVER_ERROR],
            [405, "method not allowed", ConsoleDappErrors.SERVER_ERROR],
            [413, "request entity too large", ConsoleDappErrors.SERVER_ERROR],
            [415, "unsupported media type", ConsoleDappErrors.SERVER_ERROR],
        ])("should report a %i %s as %s, not as the console being unreachable", async (status, code, error) => {
            consoleDappApiMock.remove.mockRejectedValueOnce(createApiErrorMock(status, code));

            await expect(controller.removeDapp({ id: DAPP_ID_MOCK, expectedVersion: 3 })).rejects.toEqual(new DomainError(error));
        });
    });
});
