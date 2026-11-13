import { ApiResponse, Client, ClientCreate, ClientUpdate, ManagementClient } from "auth0";
import { Auth0ManagementConfig } from "../../../../config/auth0.config";
import { DappClient, IAuth0ProvisionerService, ProvisioningError } from "../../interfaces/i-auth0-provisioner.service";
import { Auth0Call, ProvisioningMetricsProvider } from "../../provisioning.metrics";
import { classify } from "./auth0-management.error";

export class Auth0ManagementService implements IAuth0ProvisionerService {
    private readonly client: ManagementClient;
    private readonly managedBy: string;

    constructor(
        private readonly management: Auth0ManagementConfig,
        env: string,
        private readonly metrics: ProvisioningMetricsProvider,
    ) {
        this.client = new ManagementClient({
            domain: management.domain,
            clientId: management.m2mClientId,
            clientSecret: management.m2mClientSecret,
            retry: { enabled: false },
            // The SDK's own timeout stops at the response headers. A token response that stalls after them would hold every
            // later call, so this deadline covers each request through its body, the token refresh included.
            fetch: (url, init) => fetch(url, { ...init, signal: AbortSignal.timeout(management.timeoutMs) }),
        });
        this.managedBy = `console-${env}`;
    }

    /**
     * Creates the client from the template client's settings and the dApp's fields, then copies the template's connections.
     * @param client The dApp and the fields synced to Auth0.
     * @returns The new client id.
     */
    async create(client: DappClient): Promise<string> {
        const template = await this.send("get", () => this.client.clients.get({ client_id: this.management.templateClientId }));
        const wanted = await this.templateConnections();
        const body = this.createBody(template, client);
        const created = await this.send("create", () => this.client.clients.create(body));
        const clientId = created.client_id;
        await this.syncConnections(clientId, wanted);
        return clientId;
    }

    /**
     * Writes the dApp's fields to its client and resyncs the template's connections, after checking the client's tags.
     * @param clientId The client to write.
     * @param client The dApp and the fields synced to Auth0.
     */
    async update(clientId: string, client: DappClient): Promise<void> {
        await this.readTagged(client.dappId, clientId);
        const wanted = await this.templateConnections();
        await this.send("update", () => this.client.clients.update({ client_id: clientId }, this.dappFields(client)));
        await this.syncConnections(clientId, wanted);
    }

    /**
     * Throws a tag_mismatch unless the client is tagged with this dApp and this environment.
     * @param dappId The dApp.
     * @param clientId The client to check.
     */
    private async readTagged(dappId: string, clientId: string): Promise<void> {
        const client = await this.send("get", () =>
            this.client.clients.get({ client_id: clientId, fields: "client_id,client_metadata", include_fields: true }),
        );
        const tags = this.tagsOf(client);
        if (tags.dappId !== dappId || !tags.managed) {
            throw new ProvisioningError("tag_mismatch", `Auth0 client ${clientId} is not tagged with dApp ${dappId} for ${this.managedBy}`);
        }
    }

    /**
     * Reads the console's tags from a client's metadata.
     * @param client The client.
     * @returns The dApp it names, and whether this environment manages it.
     */
    private tagsOf(client: Pick<Client, "client_metadata">): { dappId: string | null; managed: boolean } {
        const metadata: Record<string, unknown> = client.client_metadata ?? {};
        return {
            dappId: typeof metadata.console_dapp_id === "string" ? metadata.console_dapp_id : null,
            managed: metadata.managed_by === this.managedBy,
        };
    }

    /**
     * Reads the template client's enabled connections, and throws when there are none.
     * @returns The connection ids.
     */
    private async templateConnections(): Promise<Set<string>> {
        const { templateClientId } = this.management;
        const connections = await this.enabledConnections(templateClientId);
        // Syncing from an empty template would switch off every login on the dApp's client, so refuse before changing anything.
        if (connections.size === 0)
            throw new ProvisioningError("failed", `The template client ${templateClientId} has no enabled connections`);
        return connections;
    }

    /**
     * Enables and disables connections until the client has exactly the wanted ones.
     * @param clientId The client.
     * @param wanted The connection ids to leave enabled.
     */
    private async syncConnections(clientId: string, wanted: Set<string>): Promise<void> {
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

    /**
     * Pages through a client's enabled connections.
     * @param clientId The client.
     * @returns The connection ids.
     */
    private async enabledConnections(clientId: string): Promise<Set<string>> {
        const ids = new Set<string>();
        let from: string | undefined;
        do {
            const page = await this.send("list_connections", () =>
                this.client.clients.getEnabledConnections({
                    client_id: clientId,
                    fields: "id",
                    include_fields: true,
                    take: 50,
                    ...(from && { from }),
                }),
            );
            for (const connection of page.connections) if (connection.id) ids.add(connection.id);
            from = page.next;
        } while (from);
        return ids;
    }

    /**
     * Builds a create request from the template's settings plus the dApp's fields.
     * @param template The template client.
     * @param client The dApp and the fields synced to Auth0.
     * @returns The create request body.
     */
    private createBody(template: Client, client: DappClient): ClientCreate {
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
            ...this.dappFields(client),
        };
    }

    /**
     * Maps the dApp's fields and the console's tags to Auth0 client fields.
     * @param client The dApp and the fields synced to Auth0.
     * @returns The client fields.
     */
    private dappFields(client: DappClient): ClientCreate & ClientUpdate {
        return {
            name: client.name,
            description: client.description,
            logo_uri: client.logoUrl,
            callbacks: client.callbackUrls,
            allowed_logout_urls: client.logoutUrls,
            web_origins: client.webOrigins,
            allowed_origins: client.webOrigins,
            client_metadata: { console_dapp_id: client.dappId, managed_by: this.managedBy, logo_uri: client.logoUrl },
        };
    }

    /**
     * Runs an SDK call, records its duration and outcome, retries it once when the failure allows, and otherwise throws a ProvisioningError.
     * @param op The Auth0 call, for metrics and messages.
     * @param call The SDK call.
     * @returns The response data.
     */
    private async send<T>(op: Auth0Call, call: () => Promise<ApiResponse<T>>): Promise<T> {
        for (let attempt = 1; ; attempt++) {
            const done = this.metrics.startAuth0Request(op);
            try {
                const response = await call();
                done("success");
                return response.data;
            } catch (error) {
                const { outcome, retryAfterMs, message } = classify(op, error, this.management);
                done(outcome);
                if (attempt === 1 && retryAfterMs !== null) {
                    await new Promise((resolve) => setTimeout(resolve, retryAfterMs));
                    continue;
                }
                const transient = outcome === "failed" || outcome === "rate_limited";
                throw new ProvisioningError(transient ? "failed" : "rejected", message);
            }
        }
    }
}
