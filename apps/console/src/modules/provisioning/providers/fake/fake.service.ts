import { randomUUID } from "node:crypto";
import { SyncedFields } from "@shared/modules/dapp";
import { IAuth0ProvisionerService } from "../../interfaces/i-auth0-provisioner.service";

export class FakeProvisionerService implements IAuth0ProvisionerService {
    readonly clients = new Map<string, { dappId: string; input: SyncedFields }>();

    /**
     * Finds the dApp's client in memory.
     * @param dappId The dApp.
     * @returns The client id, or null when none names the dApp.
     */
    async findClient(dappId: string): Promise<string | null> {
        return [...this.clients].find(([, client]) => client.dappId === dappId)?.[0] ?? null;
    }

    /**
     * Stores a client with a random id.
     * @param dappId The dApp.
     * @param input The fields synced to Auth0.
     * @returns The new client id.
     */
    async createClient(dappId: string, input: SyncedFields): Promise<string> {
        const clientId = `fake_${randomUUID()}`;
        this.clients.set(clientId, { dappId, input: structuredClone(input) });
        return clientId;
    }

    /**
     * Overwrites the stored client.
     * @param dappId The dApp.
     * @param clientId The dApp's client.
     * @param input The fields synced to Auth0.
     */
    async updateClient(dappId: string, clientId: string, input: SyncedFields): Promise<void> {
        this.clients.set(clientId, { dappId, input: structuredClone(input) });
    }

    /**
     * Removes the stored client.
     * @param _dappId The dApp.
     * @param clientId The dApp's client.
     */
    async deleteClient(_dappId: string, clientId: string): Promise<void> {
        this.clients.delete(clientId);
    }
}
