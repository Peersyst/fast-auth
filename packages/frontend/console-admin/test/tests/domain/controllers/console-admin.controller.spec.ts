import { DomainError } from "@frontend/core/domain/error";
import { ConsoleAdminController } from "../../../../src/domain/controllers";
import { ConsoleAdminErrors } from "../../../../src/domain/console-admin.errors";
import { ConsoleAdminApiMock } from "../../../mocks/data-access/api";
import { DAPP_ID_MOCK, DappMock } from "@shared/console/test/mocks/dapp";
import { createApiErrorMock } from "@shared/console/test/mocks/common";

describe("ConsoleAdminController", () => {
    const consoleAdminApiMock = new ConsoleAdminApiMock();

    const controller = new ConsoleAdminController(consoleAdminApiMock);

    beforeEach(() => {
        consoleAdminApiMock.clearMocks();
    });

    describe("listDapps", () => {
        it("should ask for the page, twenty at a time", async () => {
            const page = { items: [new DappMock()], totalItems: 45, currentPage: 2, pages: 3 };
            consoleAdminApiMock.list.mockResolvedValueOnce(page);

            await expect(controller.listDapps(2)).resolves.toBe(page);
            expect(consoleAdminApiMock.list).toHaveBeenCalledWith(2, 20);
        });

        it("should report a refusal to a signed-in user who is not an admin", async () => {
            consoleAdminApiMock.list.mockRejectedValueOnce(createApiErrorMock(403, "FORBIDDEN_ROLE"));

            await expect(controller.listDapps(1)).rejects.toEqual(new DomainError(ConsoleAdminErrors.FORBIDDEN_ROLE));
        });
    });

    describe("getDapp", () => {
        it("should return the dApp", async () => {
            await expect(controller.getDapp(DAPP_ID_MOCK)).resolves.toEqual(new DappMock());
            expect(consoleAdminApiMock.get).toHaveBeenCalledWith(DAPP_ID_MOCK);
        });

        it.each([
            ["a missing dApp", createApiErrorMock(404, "DAPP_NOT_FOUND")],
            ["an id the route does not match", createApiErrorMock(404, "not found")],
            ["an id that is not a UUID", createApiErrorMock(400, "Validation failed (uuid is expected)")],
        ])("should report %s as not found", async (_, error) => {
            consoleAdminApiMock.get.mockRejectedValueOnce(error);

            await expect(controller.getDapp("x")).rejects.toEqual(new DomainError(ConsoleAdminErrors.DAPP_NOT_FOUND));
        });
    });

    describe("actions", () => {
        it("should approve the dApp", async () => {
            await expect(controller.approveDapp(DAPP_ID_MOCK)).resolves.toEqual(new DappMock({ status: "approved" }));
            expect(consoleAdminApiMock.approve).toHaveBeenCalledWith(DAPP_ID_MOCK);
        });

        it("should reject the dApp", async () => {
            await expect(controller.rejectDapp(DAPP_ID_MOCK)).resolves.toEqual(new DappMock({ status: "rejected" }));
            expect(consoleAdminApiMock.reject).toHaveBeenCalledWith(DAPP_ID_MOCK);
        });

        it("should approve the dApp's change", async () => {
            await expect(controller.approveChange(DAPP_ID_MOCK)).resolves.toEqual(new DappMock({ status: "approved" }));
            expect(consoleAdminApiMock.approveChange).toHaveBeenCalledWith(DAPP_ID_MOCK);
        });

        it("should reject the dApp's change", async () => {
            await expect(controller.rejectChange(DAPP_ID_MOCK)).resolves.toEqual(new DappMock({ status: "approved" }));
            expect(consoleAdminApiMock.rejectChange).toHaveBeenCalledWith(DAPP_ID_MOCK);
        });

        it.each([
            [404, "DAPP_NOT_FOUND", ConsoleAdminErrors.DAPP_NOT_FOUND],
            [409, "INVALID_TRANSITION", ConsoleAdminErrors.INVALID_TRANSITION],
            [500, "Internal server error", ConsoleAdminErrors.SERVER_ERROR],
        ])("should report a %i %s as %s", async (status, code, error) => {
            consoleAdminApiMock.approve.mockRejectedValueOnce(createApiErrorMock(status, code));

            await expect(controller.approveDapp(DAPP_ID_MOCK)).rejects.toEqual(new DomainError(error));
        });

        it("should report a change that is no longer waiting for review", async () => {
            consoleAdminApiMock.approveChange.mockRejectedValueOnce(createApiErrorMock(404, "DAPP_CHANGE_NOT_FOUND"));

            await expect(controller.approveChange(DAPP_ID_MOCK)).rejects.toEqual(new DomainError(ConsoleAdminErrors.NO_PENDING_CHANGE));
        });

        it.each([
            [404, "not found"],
            [405, "method not allowed"],
            [413, "request entity too large"],
            [415, "unsupported media type"],
        ])("should report a %i %s as a server error, not as the console being unreachable", async (status, code) => {
            consoleAdminApiMock.rejectChange.mockRejectedValueOnce(createApiErrorMock(status, code));

            await expect(controller.rejectChange(DAPP_ID_MOCK)).rejects.toEqual(new DomainError(ConsoleAdminErrors.SERVER_ERROR));
        });
    });
});
