import { ApiResponse, Client, ClientCreate, ClientGrant, ClientUpdate, ManagementApiError, ManagementClient } from "auth0";
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
     * Creates the client from the template client's settings and the dApp's fields. Refuses a template without enabled
     * connections or user grants before creating anything, since `update` could not configure the client from it.
     * @param client The dApp and the fields synced to Auth0.
     * @returns The new client id.
     */
    async create(client: DappClient): Promise<string> {
        const template = await this.send("get", () => this.client.clients.get({ client_id: this.management.templateClientId }));
        await this.templateConnections();
        await this.templateGrants();
        const body = this.createBody(template, client);
        const created = await this.send("create", () => this.client.clients.create(body));
        return created.client_id;
    }

    /**
     * Configures the client. Writes the dApp's fields, sets its connections to exactly the template's and creates the
     * template's user grants it lacks. A repeated call only fills in what an earlier one left out. Refuses a template without
     * enabled connections or user grants before writing anything.
     * @param clientId The client to write.
     * @param client The dApp and the fields synced to Auth0.
     */
    async update(clientId: string, client: DappClient): Promise<void> {
        const connections = await this.templateConnections();
        const grants = await this.templateGrants();
        await this.send("update", () => this.client.clients.update({ client_id: clientId }, this.dappFields(client)));
        await this.syncConnections(clientId, connections);
        await this.copyGrants(clientId, grants);
    }

    /**
     * Creates the template's user grants whose audience the client lacks, each with the template's scopes. A grant the client
     * already has stays as it is, so a repeated call only fills in what an earlier one left out. A grant Auth0 answers 409 to
     * counts as one the client already has.
     * @param clientId The client to grant.
     * @param wanted The template's user grants.
     */
    private async copyGrants(clientId: string, wanted: Pick<ClientGrant, "audience" | "scope">[]): Promise<void> {
        const granted = new Set((await this.userGrants(clientId)).map(({ audience }) => audience));
        for (const { audience, scope } of wanted) {
            if (granted.has(audience)) continue;
            await this.send("create_grant", () =>
                this.client.clientGrants
                    .create({ client_id: clientId, audience, scope, subject_type: "user" })
                    // A 409 says the client has a grant for the audience: the first attempt of a retried call landed, or
                    // another approval made it since the list above.
                    .catch((error: unknown) => {
                        if (error instanceof ManagementApiError && error.statusCode === 409) return { data: undefined };
                        throw error;
                    }),
            );
        }
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
     * Reads the template client's user grants, and throws when there are none.
     * @returns The audience and scopes of each grant.
     */
    private async templateGrants(): Promise<Pick<ClientGrant, "audience" | "scope">[]> {
        const { templateClientId } = this.management;
        const grants = await this.userGrants(templateClientId);
        // A client without user grants gets no token for the signing APIs, so its dApp could not sign. Refuse before changing anything.
        if (grants.length === 0) throw new ProvisioningError("failed", `The template client ${templateClientId} has no user grants`);
        return grants;
    }

    /**
     * Pages through a client's user grants.
     * @param clientId The client.
     * @returns The audience and scopes of each grant.
     */
    private async userGrants(clientId: string): Promise<Pick<ClientGrant, "audience" | "scope">[]> {
        const grants: Pick<ClientGrant, "audience" | "scope">[] = [];
        let total = 0;
        for (let page = 0; page === 0 || grants.length < total; page++) {
            const result = await this.send("list_grants", () =>
                this.client.clientGrants.getAll({
                    client_id: clientId,
                    subject_type: "user",
                    per_page: 50,
                    page,
                    include_totals: true,
                }),
            );
            if (result.client_grants.length === 0) break;
            for (const { audience, scope } of result.client_grants) grants.push({ audience, scope });
            total = result.total;
        }
        return grants;
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
            // NEAR Connect logs a dApp in with its bare origin as redirect_uri, so the origins are callbacks too.
            callbacks: [...new Set([...client.callbackUrls, ...client.webOrigins])],
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
    private async send<T>(op: Auth0Call, call: () => Promise<Pick<ApiResponse<T>, "data">>): Promise<T> {
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
