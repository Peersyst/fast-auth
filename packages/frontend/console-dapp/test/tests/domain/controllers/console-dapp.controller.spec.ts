import { DomainError } from "@frontend/core/domain/error";
import { CreateDappRequest } from "@shared/console";
import { ConsoleDappController } from "../../../../src/domain/controllers";
import { ConsoleDappErrors } from "../../../../src/domain/console-dapp.errors";
import { ConsoleDappApiMock } from "../../../mocks/data-access/api";
import { createApiErrorMock } from "@shared/console/test/mocks/common";
import { DAPP_ID_MOCK, DappMock } from "@shared/console/test/mocks/dapp";

describe("ConsoleDappController", () => {
    const fields: CreateDappRequest = {
        name: "Acme Wallet",
        description: "",
        logoUrl: "https://cdn.acme.xyz/logo.png",
        mauBracket: "1k_10k",
        callbackUrls: ["https://app.acme.xyz/callback"],
        logoutUrls: [],
        webOrigins: ["https://app.acme.xyz"],
        contactEmail: "dev@acme.xyz",
    };

    const consoleDappApiMock = new ConsoleDappApiMock();

    const controller = new ConsoleDappController(consoleDappApiMock);

    beforeEach(() => {
        consoleDappApiMock.clearMocks();
    });

    describe("getMyDapp", () => {
        it("should return the owner's dApp", async () => {
            const dapp = new DappMock({ status: "approved", auth0ClientId: "client-abc" });
            consoleDappApiMock.list.mockResolvedValueOnce({ items: [dapp], totalItems: 1, currentPage: 1, pages: 1 });

            await expect(controller.getMyDapp()).resolves.toBe(dapp);
        });

        it("should return null when the owner has no dApp", async () => {
            consoleDappApiMock.list.mockResolvedValueOnce({ items: [], totalItems: 0, currentPage: 1, pages: 0 });

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
            consoleDappApiMock.list.mockRejectedValueOnce(createApiErrorMock(status, code));

            await expect(controller.getMyDapp()).rejects.toEqual(new DomainError(error));
        });

        it("should report a request that never reached the console as unreachable", async () => {
            consoleDappApiMock.list.mockRejectedValueOnce(new TypeError("Failed to fetch"));

            await expect(controller.getMyDapp()).rejects.toEqual(new DomainError(ConsoleDappErrors.CONSOLE_UNREACHABLE));
        });
    });

    describe("submitDapp", () => {
        it("should submit the fields", async () => {
            await expect(controller.submitDapp(fields)).resolves.toEqual(new DappMock());
            expect(consoleDappApiMock.create).toHaveBeenCalledWith(fields);
        });

        it("should say when the email already has a dApp", async () => {
            consoleDappApiMock.create.mockRejectedValueOnce(createApiErrorMock(409, "DAPP_ALREADY_EXISTS"));

            await expect(controller.submitDapp(fields)).rejects.toEqual(new DomainError(ConsoleDappErrors.DAPP_ALREADY_EXISTS));
        });

        it.each([
            ["the OpenAPI validator", "request/body must have required property 'name'"],
            ["the validation pipe", ["name must be a valid dApp name"]],
        ])("should report a value %s refused", async (_, message) => {
            consoleDappApiMock.create.mockRejectedValueOnce(createApiErrorMock(400, message));

            await expect(controller.submitDapp(fields)).rejects.toEqual(new DomainError(ConsoleDappErrors.VALIDATION_FAILED));
        });
    });

    describe("editDapp", () => {
        it("should save the edit", async () => {
            const request = { description: "The wallet." };

            await expect(controller.editDapp({ id: DAPP_ID_MOCK, request })).resolves.toEqual(new DappMock({ description: "The wallet." }));
            expect(consoleDappApiMock.update).toHaveBeenCalledWith(DAPP_ID_MOCK, request);
        });

        it.each([
            [404, "DAPP_NOT_FOUND", ConsoleDappErrors.DAPP_NOT_FOUND],
            [409, "INVALID_TRANSITION", ConsoleDappErrors.INVALID_TRANSITION],
            [404, "not found", ConsoleDappErrors.SERVER_ERROR],
            [405, "method not allowed", ConsoleDappErrors.SERVER_ERROR],
            [413, "request entity too large", ConsoleDappErrors.SERVER_ERROR],
            [415, "unsupported media type", ConsoleDappErrors.SERVER_ERROR],
        ])("should report a %i %s as %s", async (status, code, error) => {
            consoleDappApiMock.update.mockRejectedValueOnce(createApiErrorMock(status, code));

            await expect(controller.editDapp({ id: DAPP_ID_MOCK, request: fields })).rejects.toEqual(new DomainError(error));
        });
    });
});
