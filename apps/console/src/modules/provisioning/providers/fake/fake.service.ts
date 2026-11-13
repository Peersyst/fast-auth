import { randomUUID } from "node:crypto";
import { DappClient, IAuth0ProvisionerService } from "../../interfaces/i-auth0-provisioner.service";

export class FakeProvisionerService implements IAuth0ProvisionerService {
    readonly clients = new Map<string, DappClient>();

    /**
     * Stores a client with a random id.
     * @param client The dApp and the fields synced to Auth0.
     * @returns The new client id.
     */
    async create(client: DappClient): Promise<string> {
        const clientId = `fake_${randomUUID()}`;
        this.clients.set(clientId, structuredClone(client));
        return clientId;
    }

    /**
     * Overwrites the stored client.
     * @param clientId The client to overwrite.
     * @param client The dApp and the fields synced to Auth0.
     */
    async update(clientId: string, client: DappClient): Promise<void> {
        this.clients.set(clientId, structuredClone(client));
    }
}
