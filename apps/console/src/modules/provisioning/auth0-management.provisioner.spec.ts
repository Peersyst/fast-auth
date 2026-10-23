import { AuthApiError, FetchError, ManagementApiError, ManagementClient, ResponseError } from "auth0";
import type { Client } from "auth0";
import { Gauge, Histogram } from "prom-client";
import { MANAGEMENT_AUTH0 } from "../../../test/utils/test-config";
import type { Auth0ClientId, DappId, SyncedFields } from "../../domain/dapp";
import { Auth0ManagementProvisioner } from "./auth0-management.provisioner";
import { ProvisioningError } from "./auth0-provisioner";
import { ProvisioningMetrics } from "./provisioning.metrics";

jest.mock("auth0", () => ({ ...jest.requireActual("auth0"), ManagementClient: jest.fn() }));

const DAPP_ID = "6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b" as DappId;
const OTHER_DAPP_ID = "0a1b2c3d-4e5f-4a6b-8c7d-8e9f0a1b2c3d" as DappId;
const CLIENT_ID = "client_abc" as Auth0ClientId;

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
    description: "Template description",
    client_secret: "template-secret",
    app_type: "spa",
    token_endpoint_auth_method: "none",
    grant_types: ["authorization_code", "implicit", "refresh_token"],
    oidc_conformant: true,
    jwt_configuration: { alg: "RS256", lifetime_in_seconds: 36000, secret_encoded: false },
    refresh_token: { rotation_type: "rotating", expiration_type: "expiring", leeway: 0, token_lifetime: 2592000 },
    cross_origin_authentication: true,
    callbacks: ["https://template.example/callback"],
    web_origins: ["https://template.example"],
    client_metadata: { owner: "team" },
    signing_keys: [{ cert: "cert" }],
    is_first_party: true,
} as unknown as Client;

const clients = {
    get: jest.fn(),
    getAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    getEnabledConnections: jest.fn(),
};
const connections = { updateEnabledClients: jest.fn() };

const ok = <T>(data: T) => ({ data, headers: new Headers(), status: 200, statusText: "OK" });

const apiError = (status: number, headers: Record<string, string> = {}) =>
    new ManagementApiError("code", "Error", status, "{}", new Headers(headers), `status ${status}`);

const tagged = (dappId: string, managedBy = "console-staging") => ({
    client_id: CLIENT_ID,
    client_metadata: { console_dapp_id: dappId, managed_by: managedBy },
});

function enabledConnections(pages: Record<string, string[][]>): void {
    clients.getEnabledConnections.mockImplementation(({ client_id, from }: { client_id: string; from?: string }) => {
        const clientPages = pages[client_id] ?? [[]];
        const page = from === undefined ? 0 : Number(from);
        const next = page + 1 < clientPages.length ? { next: String(page + 1) } : {};
        return Promise.resolve(ok({ connections: (clientPages[page] ?? []).map((id) => ({ id })), ...next }));
    });
}

async function settled(promise: Promise<unknown>): Promise<unknown> {
    const outcome = promise.then(
        (value: unknown) => value,
        (error: unknown) => error,
    );
    await jest.runAllTimersAsync();
    return outcome;
}

describe("Auth0ManagementProvisioner", () => {
    let histogram: Histogram<string>;
    let provisioner: Auth0ManagementProvisioner;

    beforeEach(() => {
        jest.clearAllMocks();
        jest.mocked(ManagementClient).mockImplementation(() => ({ clients, connections }) as unknown as ManagementClient);
        enabledConnections({ "template-client": [["con_email"]] });
        connections.updateEnabledClients.mockResolvedValue(ok(undefined));
        histogram = new Histogram({ name: "h", help: "h", labelNames: ["op", "outcome"], registers: [] });
        const gauge = new Gauge({ name: "g", help: "g", registers: [] });
        provisioner = new Auth0ManagementProvisioner(MANAGEMENT_AUTH0, "staging", new ProvisioningMetrics(histogram, gauge));
    });

    afterEach(() => jest.useRealTimers());

    it("creates the Management client with its own retries off", () => {
        expect(ManagementClient).toHaveBeenCalledWith({
            domain: "tenant.eu.auth0.com",
            clientId: "m2m-id",
            clientSecret: "m2m-secret",
            retry: { enabled: false },
            fetch: expect.any(Function),
        });
    });

    it("replaces the SDK's signal with a 10 s timeout on every request", async () => {
        const fetch = jest.spyOn(globalThis, "fetch").mockResolvedValue(new Response());
        const timeout = jest.spyOn(AbortSignal, "timeout");
        const send = jest.mocked(ManagementClient).mock.calls[0]?.[0].fetch;

        await send?.("https://tenant.eu.auth0.com/oauth/token", { method: "POST", signal: new AbortController().signal });
        expect(timeout).toHaveBeenCalledWith(10_000);
        expect(fetch).toHaveBeenCalledWith("https://tenant.eu.auth0.com/oauth/token", {
            method: "POST",
            signal: timeout.mock.results[0]?.value,
        });
        fetch.mockRestore();
        timeout.mockRestore();
    });

    describe("createClient", () => {
        beforeEach(() => {
            clients.get.mockResolvedValue(ok(template));
            clients.create.mockResolvedValue(ok({ client_id: "new-client" }));
        });

        it("sends the template's explicit fields overlaid with the dApp's fields and tags", async () => {
            await expect(provisioner.createClient(DAPP_ID, input)).resolves.toBe("new-client");
            expect(clients.get).toHaveBeenCalledWith({ client_id: "template-client" });
            expect(clients.create).toHaveBeenCalledTimes(1);
            expect(clients.create).toHaveBeenCalledWith({
                app_type: "spa",
                token_endpoint_auth_method: "none",
                grant_types: ["authorization_code", "implicit", "refresh_token"],
                oidc_conformant: true,
                jwt_configuration: { alg: "RS256", lifetime_in_seconds: 36000 },
                refresh_token: { rotation_type: "rotating", expiration_type: "expiring", leeway: 0, token_lifetime: 2592000 },
                cross_origin_authentication: true,
                is_first_party: true,
                name: "Acme",
                description: "Acme wallet",
                logo_uri: "https://acme.example/logo.png",
                callbacks: ["https://acme.example/callback"],
                allowed_logout_urls: ["https://acme.example"],
                web_origins: ["https://acme.example", "https://staging.acme.example"],
                allowed_origins: ["https://acme.example", "https://staging.acme.example"],
                client_metadata: {
                    console_dapp_id: DAPP_ID,
                    managed_by: "console-staging",
                    logo_uri: "https://acme.example/logo.png",
                },
            });
        });

        it("re-reads the template client on every create", async () => {
            await provisioner.createClient(DAPP_ID, input);
            await provisioner.createClient(OTHER_DAPP_ID, input);
            expect(clients.get).toHaveBeenCalledTimes(2);
        });

        it("enables on the new client every connection enabled on the template and disables the others", async () => {
            enabledConnections({
                "template-client": [["con_email", "con_google"], ["con_apple"]],
                "new-client": [["con_email", "con_default_db"]],
            });
            await expect(provisioner.createClient(DAPP_ID, input)).resolves.toBe("new-client");
            expect(clients.getEnabledConnections.mock.calls).toEqual([
                [{ client_id: "template-client", fields: "id", include_fields: true, take: 50 }],
                [{ client_id: "template-client", fields: "id", include_fields: true, take: 50, from: "1" }],
                [{ client_id: "new-client", fields: "id", include_fields: true, take: 50 }],
            ]);
            expect(connections.updateEnabledClients.mock.calls).toEqual([
                [{ id: "con_google" }, [{ client_id: "new-client", status: true }]],
                [{ id: "con_apple" }, [{ client_id: "new-client", status: true }]],
                [{ id: "con_default_db" }, [{ client_id: "new-client", status: false }]],
            ]);
        });

        it("makes no connection call when the client already matches the template", async () => {
            enabledConnections({ "template-client": [["con_email", "con_google"]], "new-client": [["con_google", "con_email"]] });
            await provisioner.createClient(DAPP_ID, input);
            expect(clients.getEnabledConnections).toHaveBeenCalledTimes(2);
            expect(connections.updateEnabledClients).not.toHaveBeenCalled();
        });

        it.each([
            [400, "rejected", 1],
            [503, "failed", 2],
        ])("maps a %i from a connection update after the create to %s without repeating the create", async (status, kind, attempts) => {
            jest.useFakeTimers();
            enabledConnections({ "template-client": [["con_google"]] });
            connections.updateEnabledClients.mockRejectedValue(apiError(status));
            const error = await settled(provisioner.createClient(DAPP_ID, input));
            expect(error).toBeInstanceOf(ProvisioningError);
            expect(error).toMatchObject({ kind, message: `Auth0 update_connection answered ${status}: status ${status}` });
            expect(connections.updateEnabledClients).toHaveBeenCalledTimes(attempts);
            expect(clients.create).toHaveBeenCalledTimes(1);
        });

        it("creates nothing from a template with no enabled connections, which would switch off every login", async () => {
            enabledConnections({ "template-client": [[]] });
            await expect(provisioner.createClient(DAPP_ID, input)).rejects.toMatchObject({
                kind: "failed",
                message: "The template client template-client has no enabled connections",
            });
            expect(clients.create).not.toHaveBeenCalled();
            expect(connections.updateEnabledClients).not.toHaveBeenCalled();
        });
    });

    describe("findClient", () => {
        it("finds the client tagged with this dApp among the environment's clients", async () => {
            clients.getAll.mockResolvedValueOnce(
                ok({
                    clients: [
                        { client_id: "wrong-env", client_metadata: { console_dapp_id: DAPP_ID, managed_by: "console-production" } },
                        { client_id: "wrong-dapp", client_metadata: { console_dapp_id: OTHER_DAPP_ID, managed_by: "console-staging" } },
                        { client_id: "match", client_metadata: { console_dapp_id: DAPP_ID, managed_by: "console-staging" } },
                    ],
                }),
            );
            await expect(provisioner.findClient(DAPP_ID)).resolves.toBe("match");
        });

        it("returns null when no client is tagged", async () => {
            clients.getAll.mockResolvedValueOnce(ok({ clients: [{ client_id: "other", client_metadata: {} }] }));
            await expect(provisioner.findClient(DAPP_ID)).resolves.toBeNull();
        });

        it("still finds the client when another client is deleted between page reads", async () => {
            const tenant = Array.from({ length: 101 }, (_, i) => ({
                client_id: `c${i}`,
                client_metadata: {} as Record<string, string>,
            }));
            tenant[100]!.client_metadata = { console_dapp_id: DAPP_ID, managed_by: "console-staging" };
            clients.getAll.mockImplementation(({ from, take }: { from?: string; take: number }) => {
                const start = from === undefined ? 0 : tenant.findIndex((client) => client.client_id === from);
                const page = tenant.slice(start, start + take);
                const following = tenant[start + take];
                if (start === 0) tenant.splice(3, 1);
                return Promise.resolve(ok({ clients: page, ...(following && { next: following.client_id }) }));
            });
            await expect(provisioner.findClient(DAPP_ID)).resolves.toBe("c100");
        });
    });

    describe("listClients", () => {
        it("pages through the clients for every one tagged with this environment", async () => {
            const first = {
                client_id: "first",
                name: "First",
                callbacks: ["https://first.example/cb"],
                client_metadata: { console_dapp_id: DAPP_ID, managed_by: "console-staging" },
            };
            const firstPage = Array.from({ length: 100 }, (_, i) =>
                i === 7 ? first : { client_id: `other-${i}`, name: `Other ${i}`, client_metadata: {} },
            );
            clients.getAll.mockResolvedValueOnce(ok({ clients: firstPage, next: "second-page" })).mockResolvedValueOnce(
                ok({
                    clients: [
                        {
                            client_id: "wrong-env",
                            name: "Prod",
                            client_metadata: { console_dapp_id: DAPP_ID, managed_by: "console-production" },
                        },
                        { client_id: "no-metadata", name: "Legacy" },
                        { client_id: "no-dapp-tag", name: "Hand made", client_metadata: { managed_by: "console-staging" } },
                    ],
                }),
            );
            await expect(provisioner.listClients()).resolves.toEqual([
                { clientId: "first", dappId: DAPP_ID, name: "First", callbacks: ["https://first.example/cb"] },
                { clientId: "no-dapp-tag", dappId: null, name: "Hand made", callbacks: [] },
            ]);
            expect(clients.getAll).toHaveBeenNthCalledWith(1, {
                fields: "client_id,name,callbacks,client_metadata",
                include_fields: true,
                take: 100,
            });
            expect(clients.getAll).toHaveBeenNthCalledWith(2, expect.objectContaining({ from: "second-page" }));
            expect(clients.getAll).toHaveBeenCalledTimes(2);
        });
    });

    describe("updateClient", () => {
        it("reads the client, then sends the dApp's fields and tags", async () => {
            clients.get.mockResolvedValue(ok(tagged(DAPP_ID)));
            clients.update.mockResolvedValue(ok({}));
            await provisioner.updateClient(DAPP_ID, CLIENT_ID, input);
            expect(clients.get).toHaveBeenCalledWith({ client_id: CLIENT_ID, fields: "client_id,client_metadata", include_fields: true });
            expect(clients.update).toHaveBeenCalledWith(
                { client_id: CLIENT_ID },
                {
                    name: "Acme",
                    description: "Acme wallet",
                    logo_uri: input.logoUrl,
                    callbacks: input.callbackUrls,
                    allowed_logout_urls: input.logoutUrls,
                    web_origins: input.webOrigins,
                    allowed_origins: input.webOrigins,
                    client_metadata: { console_dapp_id: DAPP_ID, managed_by: "console-staging", logo_uri: input.logoUrl },
                },
            );
        });

        it("syncs connections after the update", async () => {
            clients.get.mockResolvedValue(ok(tagged(DAPP_ID)));
            clients.update.mockResolvedValue(ok({}));
            enabledConnections({ "template-client": [["con_email", "con_google"]], [CLIENT_ID]: [["con_email", "con_default_db"]] });
            await provisioner.updateClient(DAPP_ID, CLIENT_ID, input);
            expect(clients.getEnabledConnections).toHaveBeenCalledWith({
                client_id: CLIENT_ID,
                fields: "id",
                include_fields: true,
                take: 50,
            });
            expect(connections.updateEnabledClients.mock.calls).toEqual([
                [{ id: "con_google" }, [{ client_id: CLIENT_ID, status: true }]],
                [{ id: "con_default_db" }, [{ client_id: CLIENT_ID, status: false }]],
            ]);
        });

        it.each([
            ["another dApp", tagged(OTHER_DAPP_ID)],
            ["another environment", tagged(DAPP_ID, "console-production")],
            ["no tags", { client_id: CLIENT_ID, client_metadata: {} }],
        ])("refuses a client tagged with %s", async (_, client) => {
            clients.get.mockResolvedValue(ok(client));
            await expect(provisioner.updateClient(DAPP_ID, CLIENT_ID, input)).rejects.toMatchObject({ kind: "tag_mismatch" });
            expect(clients.update).not.toHaveBeenCalled();
        });

        it("changes nothing when the template client has no enabled connections", async () => {
            clients.get.mockResolvedValue(ok(tagged(DAPP_ID)));
            enabledConnections({ "template-client": [[]] });
            await expect(provisioner.updateClient(DAPP_ID, CLIENT_ID, input)).rejects.toMatchObject({ kind: "failed" });
            expect(clients.update).not.toHaveBeenCalled();
        });

        it("maps a missing client to rejected", async () => {
            clients.get.mockRejectedValue(apiError(404));
            await expect(provisioner.updateClient(DAPP_ID, CLIENT_ID, input)).rejects.toMatchObject({ kind: "rejected" });
            expect(clients.update).not.toHaveBeenCalled();
        });
    });

    describe("deleteClient", () => {
        it("deletes a tagged client", async () => {
            clients.get.mockResolvedValue(ok(tagged(DAPP_ID)));
            clients.delete.mockResolvedValue(ok(undefined));
            await provisioner.deleteClient(DAPP_ID, CLIENT_ID);
            expect(clients.delete).toHaveBeenCalledWith({ client_id: CLIENT_ID });
        });

        it("resolves when the client is already gone", async () => {
            clients.get.mockRejectedValue(apiError(404));
            await expect(provisioner.deleteClient(DAPP_ID, CLIENT_ID)).resolves.toBeUndefined();
            expect(clients.delete).not.toHaveBeenCalled();
        });

        it("resolves on a 404 from the delete itself", async () => {
            clients.get.mockResolvedValue(ok(tagged(DAPP_ID)));
            clients.delete.mockRejectedValue(apiError(404));
            await expect(provisioner.deleteClient(DAPP_ID, CLIENT_ID)).resolves.toBeUndefined();
            expect(clients.delete).toHaveBeenCalledTimes(1);
        });

        it("refuses a client without matching tags", async () => {
            clients.get.mockResolvedValue(ok(tagged(OTHER_DAPP_ID)));
            await expect(provisioner.deleteClient(DAPP_ID, CLIENT_ID)).rejects.toMatchObject({ kind: "tag_mismatch" });
            expect(clients.delete).not.toHaveBeenCalled();
        });
    });

    describe("checkHealth", () => {
        it("reads the template client and its connections", async () => {
            clients.get.mockResolvedValue(ok({ client_id: "template-client" }));
            await provisioner.checkHealth();
            expect(clients.get).toHaveBeenCalledWith({ client_id: "template-client", fields: "client_id", include_fields: true });
            expect(clients.getEnabledConnections).toHaveBeenCalledWith({
                client_id: "template-client",
                fields: "id",
                include_fields: true,
                take: 50,
            });
        });

        it("throws when the M2M client may not read connections", async () => {
            clients.get.mockResolvedValue(ok({ client_id: "template-client" }));
            clients.getEnabledConnections.mockRejectedValue(apiError(403));
            await expect(provisioner.checkHealth()).rejects.toMatchObject({ kind: "failed" });
        });

        it("throws when the template client has no enabled connections", async () => {
            clients.get.mockResolvedValue(ok({ client_id: "template-client" }));
            enabledConnections({ "template-client": [[]] });
            await expect(provisioner.checkHealth()).rejects.toMatchObject({ kind: "failed" });
        });

        it("throws when Auth0 refuses the M2M credentials", async () => {
            clients.get.mockRejectedValue(apiError(401));
            await expect(provisioner.checkHealth()).rejects.toMatchObject({ kind: "failed" });
        });
    });

    describe("retry policy", () => {
        const timeout = (): DOMException => new DOMException("The operation was aborted due to timeout", "TimeoutError");
        const calls = {
            create: () => provisioner.createClient(DAPP_ID, input),
            find: () => provisioner.findClient(DAPP_ID),
            update: () => provisioner.updateClient(DAPP_ID, CLIENT_ID, input),
            delete: () => provisioner.deleteClient(DAPP_ID, CLIENT_ID),
        };

        beforeEach(() => {
            jest.useFakeTimers();
            clients.get.mockImplementation(({ client_id }: { client_id: string }) =>
                Promise.resolve(ok(client_id === "template-client" ? template : tagged(DAPP_ID))),
            );
            clients.create.mockResolvedValue(ok({ client_id: "new-client" }));
        });

        const tokenRefusal = (): AuthApiError => new AuthApiError("access_denied", "Unauthorized", 401, "{}", new Headers());
        const tokenNotFound = (): AuthApiError => new AuthApiError("not_found", "Not Found", 404, "{}", new Headers());
        const htmlBadGateway = (): ResponseError => new ResponseError(502, "<html>", new Headers());
        const htmlNotFound = (): ResponseError => new ResponseError(404, "<html>", new Headers());

        it.each<[keyof typeof calls, string, "rejected" | "failed", number, jest.Mock, () => unknown]>([
            ["create", "a 400", "rejected", 1, clients.create, () => apiError(400)],
            ["create", "a 503", "failed", 1, clients.create, () => apiError(503)],
            ["create", "a timeout", "failed", 1, clients.create, timeout],
            ["create", "a network error", "failed", 1, clients.create, () => new FetchError(new Error("ECONNRESET"))],
            ["find", "a 500", "failed", 2, clients.getAll, () => apiError(500)],
            ["find", "a timeout", "failed", 1, clients.getAll, timeout],
            ["find", "a 502 without a JSON body", "failed", 2, clients.getAll, htmlBadGateway],
            ["find", "a 401 from the token endpoint", "failed", 1, clients.getAll, tokenRefusal],
            ["delete", "a 404 from the token endpoint", "failed", 1, clients.get, tokenNotFound],
            ["delete", "a 404 without a JSON body", "failed", 1, clients.get, htmlNotFound],
            ["create", "a 403", "failed", 1, clients.create, () => apiError(403)],
            ["update", "a 403", "failed", 1, clients.update, () => apiError(403)],
            ["update", "a 400", "rejected", 1, clients.update, () => apiError(400)],
            ["update", "a 500", "failed", 2, clients.update, () => apiError(500)],
            ["delete", "a 500", "failed", 2, clients.delete, () => apiError(500)],
        ])("%s answering %s fails as %s after %i attempt(s)", async (call, _answer, kind, attempts, mock, error) => {
            mock.mockRejectedValue(error());
            expect(await settled(calls[call]())).toMatchObject({ kind });
            expect(mock).toHaveBeenCalledTimes(attempts);
        });

        it("succeeds when the one retry of a 5xx succeeds, a second later", async () => {
            clients.update.mockRejectedValueOnce(apiError(502)).mockResolvedValueOnce(ok({}));
            const updated = calls.update();
            await jest.advanceTimersByTimeAsync(999);
            expect(clients.update).toHaveBeenCalledTimes(1);
            await jest.advanceTimersByTimeAsync(1);
            await updated;
            expect(clients.update).toHaveBeenCalledTimes(2);
        });

        it.each([
            ["a Retry-After of 9999 s", 10_000, { "retry-after": "9999" }],
            ["a Retry-After of 2 s", 2_000, { "retry-after": "2" }],
            ["no Retry-After", 1_000, {}],
        ])("retries a 429 with %s after %i ms", async (_case, waitMs, headers) => {
            clients.create.mockRejectedValueOnce(apiError(429, headers));
            const created = calls.create();
            await jest.advanceTimersByTimeAsync(waitMs - 1);
            expect(clients.create).toHaveBeenCalledTimes(1);
            await jest.advanceTimersByTimeAsync(1);
            await expect(created).resolves.toBe("new-client");
            expect(clients.create).toHaveBeenCalledTimes(2);
        });

        it("keeps what made a network call fail in the message", async () => {
            const dns = Object.assign(new Error("getaddrinfo ENOTFOUND tenant.eu.auth0.com"), { code: "ENOTFOUND" });
            clients.getAll.mockRejectedValue(new FetchError(new TypeError("fetch failed", { cause: dns }), "fetch failed"));
            expect(await settled(calls.find())).toMatchObject({
                message: "Auth0 list failed: fetch failed: getaddrinfo ENOTFOUND tenant.eu.auth0.com",
            });
        });

        it("names the errno when every address of the host refused", async () => {
            const refused = Object.assign(new AggregateError([], ""), { code: "ECONNREFUSED" });
            clients.getAll.mockRejectedValue(new FetchError(new TypeError("fetch failed", { cause: refused }), "fetch failed"));
            expect(await settled(calls.find())).toMatchObject({ message: "Auth0 list failed: fetch failed: ECONNREFUSED" });
        });

        it("maps a second 429 to failed, as it is transient", async () => {
            clients.create.mockRejectedValue(apiError(429, { "retry-after": "0" }));
            expect(await settled(calls.create())).toMatchObject({ kind: "failed" });
            expect(clients.create).toHaveBeenCalledTimes(2);
        });
    });

    it("observes every Management call by operation and outcome", async () => {
        jest.useFakeTimers();
        clients.get.mockRejectedValueOnce(apiError(503)).mockResolvedValueOnce(ok(template));
        clients.create.mockRejectedValueOnce(apiError(400));
        await settled(provisioner.createClient(DAPP_ID, input));
        const counts = (await histogram.get()).values
            .filter((value) => value.metricName === "h_count")
            .map((value) => ({ ...value.labels, count: value.value }));
        expect(counts).toEqual([
            { op: "get", outcome: "failed", count: 1 },
            { op: "get", outcome: "success", count: 1 },
            { op: "list_connections", outcome: "success", count: 1 },
            { op: "create", outcome: "rejected", count: 1 },
        ]);
    });
});
