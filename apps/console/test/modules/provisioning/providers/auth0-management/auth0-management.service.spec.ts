import { Test } from "@nestjs/testing";
import { AuthApiError, Client, ManagementApiError, ManagementClient } from "auth0";
import { register } from "prom-client";
import { SyncedFields } from "@shared/modules/dapp";
import { Auth0ProvisionerName } from "../../../../../src/config/auth0.config";
import { ProvisioningError } from "../../../../../src/modules/provisioning/interfaces/i-auth0-provisioner.service";
import { Auth0ManagementService } from "../../../../../src/modules/provisioning/providers/auth0-management/auth0-management.service";
import { ProvisioningModule } from "../../../../../src/modules/provisioning/provisioning.module";
import { AUTH0_PROVISIONER } from "../../../../../src/modules/provisioning/provisioning.tokens";
import { ClientsMock } from "../../../../mocks/auth0/clients.mock";
import { ConnectionsMock } from "../../../../mocks/auth0/connections.mock";
import { configStubModule, createConfigServiceMock, testConfig } from "../../../../mocks/config/config.mock";

jest.mock("auth0", () => ({ ...jest.requireActual("auth0"), ManagementClient: jest.fn() }));

/**
 * Builds the Management API's JSON error for a status.
 * @param status The HTTP status.
 * @param headers The response headers.
 * @returns The SDK error.
 */
const apiError = (status: number, headers: Record<string, string> = {}) =>
    new ManagementApiError("code", "Error", status, "{}", new Headers(headers), `status ${status}`);

describe("Auth0ManagementService", () => {
    const dappId = "6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b";
    const clientId = "client_abc";

    const input: SyncedFields = {
        name: "Acme",
        description: "Acme wallet",
        logoUrl: "https://acme.example/logo.png",
        callbackUrls: ["https://acme.example/callback"],
        logoutUrls: ["https://acme.example"],
        webOrigins: ["https://acme.example", "https://staging.acme.example"],
    };

    const template = {
        client_id: "template-client",
        name: "Template",
        client_secret: "template-secret",
        grant_types: ["authorization_code", "refresh_token"],
        oidc_conformant: true,
        jwt_configuration: { alg: "RS256", lifetime_in_seconds: 36000, secret_encoded: false },
        refresh_token: { rotation_type: "rotating", expiration_type: "expiring" },
        cross_origin_authentication: true,
        callbacks: ["https://template.example/callback"],
        is_first_party: true,
    } as unknown as Client;

    /**
     * Builds a client whose metadata carries the console's tags.
     * @param forDapp The dApp it names.
     * @param managedBy The environment tag.
     * @returns The client.
     */
    const tagged = (forDapp: string, managedBy = "console-test") => ({
        client_id: clientId,
        client_metadata: { console_dapp_id: forDapp, managed_by: managedBy },
    });

    const clients = new ClientsMock();
    const connections = new ConnectionsMock();
    let provisioner: Auth0ManagementService;

    /**
     * Makes every client answer the given enabled connections, in one page.
     * @param byClient The connection ids by client id.
     */
    const enabledConnections = (byClient: Record<string, string[]>): void => {
        clients.getEnabledConnections.mockImplementation(({ client_id }: { client_id: string }) =>
            Promise.resolve({ data: { connections: (byClient[client_id] ?? []).map((id) => ({ id })) } }),
        );
    };

    beforeEach(async () => {
        clients.clearMocks();
        connections.clearMocks();
        register.resetMetrics();
        (ManagementClient as unknown as jest.Mock).mockImplementation(() => ({ clients, connections }));
        const { auth0 } = testConfig();
        const configService = createConfigServiceMock({
            auth0: {
                ...auth0,
                provisioner: Auth0ProvisionerName.MANAGEMENT,
                management: {
                    domain: "tenant.eu.auth0.com",
                    m2mClientId: "m2m-id",
                    m2mClientSecret: "m2m-secret",
                    templateClientId: "template-client",
                    retryAfterMs: 1,
                    maxRetryAfterMs: 5,
                    timeoutMs: 10000,
                },
            },
        });
        const module = await Test.createTestingModule({
            imports: [configStubModule(configService), ProvisioningModule],
        }).compile();
        provisioner = module.get(AUTH0_PROVISIONER);
        enabledConnections({ "template-client": ["con_email", "con_google"] });
        clients.update.mockResolvedValue({});
        clients.delete.mockResolvedValue({});
        connections.updateEnabledClients.mockResolvedValue({});
    });

    describe("createClient", () => {
        it("should create a SPA client from the template's settings, the dApp's fields and the console's tags", async () => {
            clients.get.mockResolvedValueOnce({ data: template });
            clients.create.mockResolvedValueOnce({ data: { client_id: clientId } });

            await expect(provisioner.createClient(dappId, input)).resolves.toBe(clientId);

            expect(clients.create).toHaveBeenCalledWith({
                app_type: "spa",
                token_endpoint_auth_method: "none",
                grant_types: ["authorization_code", "refresh_token"],
                oidc_conformant: true,
                jwt_configuration: { lifetime_in_seconds: 36000, alg: "RS256" },
                refresh_token: { rotation_type: "rotating", expiration_type: "expiring" },
                cross_origin_authentication: true,
                is_first_party: true,
                name: "Acme",
                description: "Acme wallet",
                logo_uri: "https://acme.example/logo.png",
                callbacks: ["https://acme.example/callback"],
                allowed_logout_urls: ["https://acme.example"],
                web_origins: ["https://acme.example", "https://staging.acme.example"],
                allowed_origins: ["https://acme.example", "https://staging.acme.example"],
                client_metadata: { console_dapp_id: dappId, managed_by: "console-test", logo_uri: "https://acme.example/logo.png" },
            });
        });

        it("should leave the new client with exactly the template's connections", async () => {
            clients.get.mockResolvedValueOnce({ data: template });
            clients.create.mockResolvedValueOnce({ data: { client_id: clientId } });
            enabledConnections({ "template-client": ["con_email", "con_google"], [clientId]: ["con_email", "con_github"] });

            await provisioner.createClient(dappId, input);

            expect(connections.updateEnabledClients.mock.calls).toEqual([
                [{ id: "con_google" }, [{ client_id: clientId, status: true }]],
                [{ id: "con_github" }, [{ client_id: clientId, status: false }]],
            ]);
        });

        it("should create nothing from a template without enabled connections, which would switch off every login", async () => {
            clients.get.mockResolvedValueOnce({ data: template });
            enabledConnections({});

            await expect(provisioner.createClient(dappId, input)).rejects.toEqual(
                new ProvisioningError("failed", "The template client template-client has no enabled connections"),
            );
            expect(clients.create).not.toHaveBeenCalled();
        });

        it("should not retry a create that answered 5xx, since it may have created the client", async () => {
            clients.get.mockResolvedValueOnce({ data: template });
            clients.create.mockRejectedValueOnce(apiError(503));

            await expect(provisioner.createClient(dappId, input)).rejects.toMatchObject({
                kind: "failed",
                message: "Auth0 create answered 503: status 503",
            });
            expect(clients.create).toHaveBeenCalledTimes(1);
        });
    });

    describe("findClient and listClients", () => {
        it("should page through every client and keep the ones tagged for this environment", async () => {
            clients.getAll
                .mockResolvedValueOnce({
                    data: {
                        clients: [
                            { ...tagged("other-dapp", "console-production"), client_id: "prod" },
                            { client_id: "untagged", name: "Raw" },
                        ],
                        next: "p2",
                    },
                })
                .mockResolvedValueOnce({
                    data: { clients: [{ ...tagged(dappId), name: "Acme", callbacks: ["https://acme.example/cb"] }] },
                });

            await expect(provisioner.listClients()).resolves.toEqual([
                { clientId, dappId, name: "Acme", callbacks: ["https://acme.example/cb"] },
            ]);
            expect(clients.getAll).toHaveBeenLastCalledWith(expect.objectContaining({ from: "p2", take: 100 }));
        });

        it("should find the client tagged with the dApp, or null", async () => {
            clients.getAll.mockResolvedValue({ data: { clients: [{ ...tagged(dappId), name: "Acme" }] } });

            await expect(provisioner.findClient(dappId)).resolves.toBe(clientId);
            await expect(provisioner.findClient("another-dapp")).resolves.toBeNull();
        });
    });

    describe("updateClient", () => {
        it("should check the tags, then send the dApp's fields and resync the connections", async () => {
            clients.get.mockResolvedValueOnce({ data: tagged(dappId) });

            await provisioner.updateClient(dappId, clientId, input);

            expect(clients.update).toHaveBeenCalledWith(
                { client_id: clientId },
                expect.objectContaining({ name: "Acme", web_origins: input.webOrigins }),
            );
            expect(connections.updateEnabledClients.mock.calls).toEqual([
                [{ id: "con_email" }, [{ client_id: clientId, status: true }]],
                [{ id: "con_google" }, [{ client_id: clientId, status: true }]],
            ]);
        });

        it.each([
            ["another dApp", tagged("another-dapp")],
            ["another environment", tagged(dappId, "console-production")],
            ["no tags", { client_id: clientId }],
        ])("should refuse a client tagged for %s with tag_mismatch and change nothing", async (_case, client) => {
            clients.get.mockResolvedValueOnce({ data: client });

            await expect(provisioner.updateClient(dappId, clientId, input)).rejects.toMatchObject({ kind: "tag_mismatch" });
            expect(clients.update).not.toHaveBeenCalled();
        });

        it("should map a missing client to rejected", async () => {
            clients.get.mockRejectedValueOnce(apiError(404));

            await expect(provisioner.updateClient(dappId, clientId, input)).rejects.toMatchObject({ kind: "rejected" });
        });
    });

    describe("deleteClient", () => {
        it("should delete a tagged client", async () => {
            clients.get.mockResolvedValueOnce({ data: tagged(dappId) });

            await provisioner.deleteClient(dappId, clientId);

            expect(clients.delete).toHaveBeenCalledWith({ client_id: clientId });
        });

        it("should resolve when the client is already gone", async () => {
            clients.get.mockRejectedValueOnce(apiError(404));

            await expect(provisioner.deleteClient(dappId, clientId)).resolves.toBeUndefined();
            expect(clients.delete).not.toHaveBeenCalled();
        });
    });

    describe("retries and failures", () => {
        it("should retry a 5xx once and succeed", async () => {
            clients.get.mockRejectedValueOnce(apiError(502)).mockResolvedValueOnce({ data: tagged(dappId) });

            await provisioner.deleteClient(dappId, clientId);

            expect(clients.get).toHaveBeenCalledTimes(2);
            expect(clients.delete).toHaveBeenCalledTimes(1);
        });

        it("should retry a 429 once and map a second 429 to failed, as it is transient", async () => {
            clients.get.mockRejectedValue(apiError(429, { "retry-after": "60" }));

            await expect(provisioner.deleteClient(dappId, clientId)).rejects.toMatchObject({
                kind: "failed",
                message: "Auth0 get answered 429: status 429",
            });
            expect(clients.get).toHaveBeenCalledTimes(2);
        });

        it.each([
            ["a 400", "rejected", apiError(400)],
            ["a 401", "failed", apiError(401)],
            ["a 403", "failed", apiError(403)],
            ["a token endpoint 4xx", "failed", new AuthApiError("access_denied", "Unauthorized", 401, "{}", new Headers())],
        ])("should not retry %s and map it to %s", async (_case, kind, error) => {
            clients.get.mockRejectedValueOnce(error);

            await expect(provisioner.deleteClient(dappId, clientId)).rejects.toMatchObject({ kind });
            expect(clients.get).toHaveBeenCalledTimes(1);
        });

        it("should keep what made a network call fail in the message", async () => {
            clients.get.mockRejectedValueOnce(
                new TypeError("fetch failed", { cause: new Error("getaddrinfo ENOTFOUND tenant.eu.auth0.com") }),
            );

            await expect(provisioner.deleteClient(dappId, clientId)).rejects.toMatchObject({
                kind: "failed",
                message: "Auth0 get failed: fetch failed: getaddrinfo ENOTFOUND tenant.eu.auth0.com",
            });
        });

        it("should observe every call by operation and outcome", async () => {
            clients.get.mockRejectedValueOnce(apiError(404));
            await provisioner.deleteClient(dappId, clientId);

            const metric = await register.getSingleMetric("console_auth0_request_duration_seconds")!.get();
            const counts = metric.values
                .filter((value) => (value as { metricName?: string }).metricName?.endsWith("_count") && value.value > 0)
                .map((value) => value.labels);
            expect(counts).toEqual([{ op: "get", outcome: "not_found" }]);
        });
    });
});
