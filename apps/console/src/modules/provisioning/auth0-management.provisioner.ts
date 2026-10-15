import { AuthApiError, ManagementApiError, ManagementClient, ResponseError } from "auth0";
import type { ApiResponse, Client, ClientCreate, ClientUpdate, GetClients200ResponseOneOf1 } from "auth0";
import type { ConfigEnv, ManagementAuth0Config } from "../../config/console-config";
import type { Auth0ClientId, DappId, SyncedFields } from "../../domain/dapp";
import { causeChain } from "../common/exception/cause-chain";
import type { Auth0Provisioner, ManagedClient } from "./auth0-provisioner";
import { ProvisioningError } from "./auth0-provisioner";
import type { Auth0Call, Auth0Outcome, ProvisioningMetrics } from "./provisioning.metrics";

const TIMEOUT_MS = 10_000;
const PAGE_SIZE = 100;
const CONNECTION_PAGE_SIZE = 50;
const DEFAULT_RETRY_AFTER_MS = 1_000;
const MAX_RETRY_AFTER_MS = 10_000;

export const managedByTag = (env: ConfigEnv): string => `console-${env}`;

type Failure = { outcome: Exclude<Auth0Outcome, "success">; retryAfterMs: number | null; message: string };

class Auth0CallError extends ProvisioningError {
    constructor(
        kind: "rejected" | "failed",
        message: string,
        readonly outcome: Failure["outcome"],
    ) {
        super(kind, message);
    }
}

function retryAfterMs(headers: Headers): number {
    const seconds = Number(headers.get("retry-after") ?? NaN);
    return Number.isFinite(seconds) && seconds >= 0 ? Math.min(seconds * 1000, MAX_RETRY_AFTER_MS) : DEFAULT_RETRY_AFTER_MS;
}

function classify(op: Auth0Call, error: unknown): Failure {
    if (error instanceof ManagementApiError || error instanceof ResponseError || error instanceof AuthApiError) {
        const status = error.statusCode;
        const message = `Auth0 ${op} answered ${status}: ${error.message}`;
        if (status === 429) return { outcome: "rate_limited", retryAfterMs: retryAfterMs(error.headers), message };
        // A 401 or 403, or a 4xx the token endpoint answers in JSON, means the console's own credentials or scopes are wrong,
        // not the dApp's data, and a retry cannot fix it.
        if (status === 401 || status === 403 || (error instanceof AuthApiError && status < 500)) {
            return { outcome: "failed", retryAfterMs: null, message };
        }
        // Only the Management API's JSON 404 says the client does not exist. A 404 without that body comes from a proxy, a wrong
        // domain or a token endpoint that answered in HTML.
        if (status === 404) {
            return error instanceof ManagementApiError
                ? { outcome: "not_found", retryAfterMs: null, message }
                : { outcome: "failed", retryAfterMs: null, message };
        }
        if (status >= 400 && status < 500) return { outcome: "rejected", retryAfterMs: null, message };
        // A create that answered 5xx may still have made the client, so only the caller's find-then-create may repeat it.
        return { outcome: "failed", retryAfterMs: op === "create" ? null : DEFAULT_RETRY_AFTER_MS, message };
    }
    return { outcome: "failed", retryAfterMs: null, message: `Auth0 ${op} failed: ${causeChain(error)}` };
}

const sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

export class Auth0ManagementProvisioner implements Auth0Provisioner {
    private readonly client: ManagementClient;
    private readonly managedBy: string;

    constructor(
        private readonly auth0: ManagementAuth0Config,
        env: ConfigEnv,
        private readonly metrics: ProvisioningMetrics,
    ) {
        this.client = new ManagementClient({
            domain: auth0.mgmtDomain,
            clientId: auth0.m2mClientId,
            clientSecret: auth0.m2mClientSecret,
            retry: { enabled: false },
            // The SDK's own timeout stops at the response headers. A token response that stalls after them would hold every
            // later call, so this deadline covers each request through its body, the token refresh included.
            fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) }),
        });
        this.managedBy = managedByTag(env);
    }

    async findClient(dappId: DappId): Promise<Auth0ClientId | null> {
        return (await this.listClients()).find((client) => client.dappId === dappId)?.clientId ?? null;
    }

    async createClient(dappId: DappId, input: SyncedFields): Promise<Auth0ClientId> {
        const template = await this.send("get", () => this.client.clients.get({ client_id: this.auth0.templateClientId }));
        const wanted = await this.templateConnections();
        const body = this.createBody(template, dappId, input);
        const created = await this.send("create", () => this.client.clients.create(body));
        const clientId = created.client_id as Auth0ClientId;
        await this.syncConnections(clientId, wanted);
        return clientId;
    }

    async updateClient(dappId: DappId, clientId: Auth0ClientId, input: SyncedFields): Promise<void> {
        await this.readTagged(dappId, clientId);
        const wanted = await this.templateConnections();
        await this.send("update", () => this.client.clients.update({ client_id: clientId }, this.dappFields(dappId, input)));
        await this.syncConnections(clientId, wanted);
    }

    async deleteClient(dappId: DappId, clientId: Auth0ClientId): Promise<void> {
        try {
            await this.readTagged(dappId, clientId);
            await this.send("delete", () => this.client.clients.delete({ client_id: clientId }));
        } catch (error) {
            if (!(error instanceof Auth0CallError && error.outcome === "not_found")) throw error;
        }
    }

    async checkHealth(): Promise<void> {
        await this.send("get", () =>
            this.client.clients.get({ client_id: this.auth0.templateClientId, fields: "client_id", include_fields: true }),
        );
        await this.templateConnections();
    }

    async listClients(): Promise<ManagedClient[]> {
        const managed: ManagedClient[] = [];
        let from: string | undefined;
        do {
            // With `from` and `take` Auth0 pages by checkpoint and answers `{ clients, next }`, which no `getAll` overload returns.
            const page = await this.send(
                "list",
                () =>
                    this.client.clients.getAll({
                        fields: "client_id,name,callbacks,client_metadata",
                        include_fields: true,
                        take: PAGE_SIZE,
                        ...(from && { from }),
                    }) as unknown as Promise<ApiResponse<GetClients200ResponseOneOf1>>,
            );
            for (const client of page.clients) {
                const { dappId, managed: isManaged } = this.tagsOf(client);
                if (!isManaged) continue;
                managed.push({
                    clientId: client.client_id as Auth0ClientId,
                    dappId,
                    name: client.name,
                    callbacks: client.callbacks ?? [],
                });
            }
            from = page.next;
        } while (from);
        return managed;
    }

    private async readTagged(dappId: DappId, clientId: Auth0ClientId): Promise<void> {
        const client = await this.send("get", () =>
            this.client.clients.get({ client_id: clientId, fields: "client_id,client_metadata", include_fields: true }),
        );
        const tags = this.tagsOf(client);
        if (tags.dappId !== dappId || !tags.managed) {
            throw new ProvisioningError("tag_mismatch", `Auth0 client ${clientId} is not tagged with dApp ${dappId} for ${this.managedBy}`);
        }
    }

    private tagsOf(client: Pick<Client, "client_metadata">): { dappId: DappId | null; managed: boolean } {
        const metadata: Record<string, unknown> = client.client_metadata ?? {};
        return {
            dappId: typeof metadata.console_dapp_id === "string" ? (metadata.console_dapp_id as DappId) : null,
            managed: metadata.managed_by === this.managedBy,
        };
    }

    private async templateConnections(): Promise<Set<string>> {
        const { templateClientId } = this.auth0;
        const connections = await this.enabledConnections(templateClientId);
        // Syncing from an empty template would switch off every login on the dApp's client, so refuse before changing anything.
        if (connections.size === 0)
            throw new ProvisioningError("failed", `The template client ${templateClientId} has no enabled connections`);
        return connections;
    }

    private async syncConnections(clientId: Auth0ClientId, wanted: Set<string>): Promise<void> {
        const enabled = await this.enabledConnections(clientId);
        const changes = [
            ...[...wanted].filter((id) => !enabled.has(id)).map((id) => ({ id, status: true })),
            ...[...enabled].filter((id) => !wanted.has(id)).map((id) => ({ id, status: false })),
        ];
        for (const { id, status } of changes) {
            await this.send("update_connection", () =>
                this.client.connections.updateEnabledClients({ id }, [{ client_id: clientId, status }]),
            );
        }
    }

    private async enabledConnections(clientId: string): Promise<Set<string>> {
        const ids = new Set<string>();
        let from: string | undefined;
        do {
            const page = await this.send("list_connections", () =>
                this.client.clients.getEnabledConnections({
                    client_id: clientId,
                    fields: "id",
                    include_fields: true,
                    take: CONNECTION_PAGE_SIZE,
                    ...(from && { from }),
                }),
            );
            for (const connection of page.connections) if (connection.id) ids.add(connection.id);
            from = page.next;
        } while (from);
        return ids;
    }

    private createBody(template: Client, dappId: DappId, input: SyncedFields): ClientCreate {
        const { lifetime_in_seconds, alg, scopes } = template.jwt_configuration;
        return {
            app_type: "spa",
            token_endpoint_auth_method: "none",
            grant_types: template.grant_types,
            oidc_conformant: template.oidc_conformant,
            jwt_configuration: {
                lifetime_in_seconds,
                alg,
                ...(scopes && { scopes }),
            },
            refresh_token: template.refresh_token,
            cross_origin_authentication: template.cross_origin_authentication,
            is_first_party: template.is_first_party,
            ...this.dappFields(dappId, input),
        };
    }

    private dappFields(dappId: DappId, input: SyncedFields): ClientCreate & ClientUpdate {
        return {
            name: input.name,
            description: input.description,
            logo_uri: input.logoUrl,
            callbacks: input.callbackUrls,
            allowed_logout_urls: input.logoutUrls,
            web_origins: input.webOrigins,
            allowed_origins: input.webOrigins,
            client_metadata: { console_dapp_id: dappId, managed_by: this.managedBy, logo_uri: input.logoUrl },
        };
    }

    private async send<T>(op: Auth0Call, call: () => Promise<ApiResponse<T>>): Promise<T> {
        for (let attempt = 1; ; attempt++) {
            const done = this.metrics.startAuth0Request(op);
            try {
                const response = await call();
                done("success");
                return response.data;
            } catch (error) {
                const failure = classify(op, error);
                done(failure.outcome);
                if (attempt === 1 && failure.retryAfterMs !== null) {
                    await sleep(failure.retryAfterMs);
                    continue;
                }
                const transient = failure.outcome === "failed" || failure.outcome === "rate_limited";
                throw new Auth0CallError(transient ? "failed" : "rejected", failure.message, failure.outcome);
            }
        }
    }
}
