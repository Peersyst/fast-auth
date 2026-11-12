import { DomainError } from "@frontend/core/domain/error";
import { ConsoleAdminController } from "../../../../src/domain/controllers";
import { ConsoleAdminErrors } from "../../../../src/domain/console-admin.errors";
import { ConsoleAdminApiMock, ConsoleSettingApiMock } from "../../../mocks/data-access/api";
import { ADMIN_DAPP_ID_MOCK, AdminDappMock } from "@shared/console/test/mocks/admin";
import { createApiErrorMock } from "@shared/console/test/mocks/common";

const ID = ADMIN_DAPP_ID_MOCK;

describe("ConsoleAdminController", () => {
    const consoleAdminApiMock = new ConsoleAdminApiMock();
    const consoleSettingApiMock = new ConsoleSettingApiMock();

    const controller = new ConsoleAdminController(consoleAdminApiMock, consoleSettingApiMock);

    beforeEach(() => {
        consoleAdminApiMock.clearMocks();
        consoleSettingApiMock.clearMocks();
    });

    describe("listDapps", () => {
        it("should ask for a page of twenty with the filter, sort and search", async () => {
            const page = { items: [new AdminDappMock()], totalItems: 45, currentPage: 2, pages: 3 };
            consoleAdminApiMock.list.mockResolvedValueOnce(page);

            await expect(
                controller.listDapps({ page: 2, order: "DESC", orderBy: "name", needsReview: false, status: "removed", search: "acme" }),
            ).resolves.toBe(page);
            expect(consoleAdminApiMock.list).toHaveBeenCalledWith(2, 20, "DESC", "name", false, "removed", "acme");
        });

        it("should report a refusal to a signed-in user who is not an admin", async () => {
            consoleAdminApiMock.list.mockRejectedValueOnce(createApiErrorMock(403, "FORBIDDEN_ROLE"));

            await expect(controller.listDapps({ page: 1, order: "ASC", needsReview: true })).rejects.toEqual(
                new DomainError(ConsoleAdminErrors.FORBIDDEN_ROLE),
            );
        });
    });

    describe("getDapp", () => {
        it("should return the dApp", async () => {
            await expect(controller.getDapp(ID)).resolves.toEqual(new AdminDappMock());
            expect(consoleAdminApiMock.get).toHaveBeenCalledWith(ID);
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

    describe("getDappEvents", () => {
        it("should return the dApp's events", async () => {
            const events = [
                {
                    id: "e1",
                    type: "submitted" as const,
                    actorRole: "user" as const,
                    details: { chosenForAutoApproval: false },
                    createdAt: "2026-10-01T10:00:00.000Z",
                },
            ];
            consoleAdminApiMock.listEvents.mockResolvedValueOnce(events);

            await expect(controller.getDappEvents(ID)).resolves.toBe(events);
            expect(consoleAdminApiMock.listEvents).toHaveBeenCalledWith(ID);
        });
    });

    describe("editDapp", () => {
        const request = {
            name: "Acme Pay",
            description: "",
            logoUrl: "https://cdn.acme.xyz/logo.png",
            mauBracket: "1k_10k" as const,
            callbackUrls: ["https://app.acme.xyz/callback"],
            logoutUrls: [],
            webOrigins: ["https://app.acme.xyz"],
            contactEmail: "dev@acme.xyz",
            expectedVersion: 3,
        };

        it("should save the edit with the version it was made on", async () => {
            await controller.editDapp({ id: ID, request });

            expect(consoleAdminApiMock.edit).toHaveBeenCalledWith(ID, request);
        });

        it("should point to the stored Auth0 error when Auth0 refuses the edit", async () => {
            consoleAdminApiMock.edit.mockRejectedValueOnce(createApiErrorMock(422, "PROVISIONING_REJECTED"));

            await expect(controller.editDapp({ id: ID, request })).rejects.toEqual(
                new DomainError(ConsoleAdminErrors.PROVISIONING_REJECTED),
            );
        });

        it("should report a value the console's validation refused", async () => {
            consoleAdminApiMock.edit.mockRejectedValueOnce(createApiErrorMock(400, ["webOrigins must be a list of valid web origins"]));

            await expect(controller.editDapp({ id: ID, request })).rejects.toEqual(new DomainError(ConsoleAdminErrors.VALIDATION_FAILED));
        });
    });

    describe("actions", () => {
        it("should approve on the version shown", async () => {
            await controller.approveDapp({ id: ID, expectedVersion: 3 });

            expect(consoleAdminApiMock.approve).toHaveBeenCalledWith(ID, { expectedVersion: 3 });
        });

        it("should reject on the version shown", async () => {
            await controller.rejectDapp({ id: ID, expectedVersion: 3 });

            expect(consoleAdminApiMock.reject).toHaveBeenCalledWith(ID, { expectedVersion: 3 });
        });

        it("should approve a change on the version shown", async () => {
            await controller.approveChange({ id: ID, expectedVersion: 7 });

            expect(consoleAdminApiMock.approveChange).toHaveBeenCalledWith(ID, { expectedVersion: 7 });
        });

        it("should reject a change on the version shown", async () => {
            await controller.rejectChange({ id: ID, expectedVersion: 7 });

            expect(consoleAdminApiMock.rejectChange).toHaveBeenCalledWith(ID, { expectedVersion: 7 });
        });

        it("should remove on the version shown", async () => {
            await controller.removeDapp({ id: ID, expectedVersion: 3 });

            expect(consoleAdminApiMock.remove).toHaveBeenCalledWith(ID, { expectedVersion: 3 });
        });

        it.each([
            [409, "DAPP_CHANGED", ConsoleAdminErrors.DAPP_CHANGED],
            [409, "INVALID_TRANSITION", ConsoleAdminErrors.INVALID_TRANSITION],
            [409, "NO_PENDING_CHANGE", ConsoleAdminErrors.NO_PENDING_CHANGE],
            [422, "PROVISIONING_REJECTED", ConsoleAdminErrors.PROVISIONING_REJECTED],
            [502, "PROVISIONING_FAILED", ConsoleAdminErrors.PROVISIONING_FAILED],
        ])("should report a %i %s as %s", async (status, code, error) => {
            consoleAdminApiMock.approve.mockRejectedValueOnce(createApiErrorMock(status, code));

            await expect(controller.approveDapp({ id: ID, expectedVersion: 3 })).rejects.toEqual(new DomainError(error));
        });

        it.each([
            [404, "not found"],
            [405, "method not allowed"],
            [413, "request entity too large"],
            [415, "unsupported media type"],
        ])("should report a %i %s as a server error, not as the console being unreachable", async (status, code) => {
            consoleAdminApiMock.remove.mockRejectedValueOnce(createApiErrorMock(status, code));

            await expect(controller.removeDapp({ id: ID, expectedVersion: 3 })).rejects.toEqual(
                new DomainError(ConsoleAdminErrors.SERVER_ERROR),
            );
        });
    });

    describe("settings", () => {
        it("should return the settings", async () => {
            await expect(controller.getSettings()).resolves.toEqual({ autoApproval: { enabled: false } });
        });

        it("should turn auto-approval on", async () => {
            await expect(controller.setAutoApproval(true)).resolves.toEqual({ autoApproval: { enabled: true } });
            expect(consoleSettingApiMock.update).toHaveBeenCalledWith({ autoApproval: { enabled: true } });
        });
    });
});
