import type { Auth0ClientId, DappId, SyncedFields } from "../../domain/dapp";

export type ManagedClient = {
    clientId: Auth0ClientId;
    /** Null when the client has no `console_dapp_id` tag. */
    dappId: DappId | null;
    name: string;
    callbacks: string[];
};

export interface Auth0Provisioner {
    findClient(dappId: DappId): Promise<Auth0ClientId | null>;
    /** Can create the client even when it throws, so find it before creating again. */
    createClient(dappId: DappId, input: SyncedFields): Promise<Auth0ClientId>;
    updateClient(dappId: DappId, clientId: Auth0ClientId, input: SyncedFields): Promise<void>;
    /** Resolves when Auth0 answers that the client does not exist. */
    deleteClient(dappId: DappId, clientId: Auth0ClientId): Promise<void>;
    checkHealth(): Promise<void>;
    /** Every client tagged with this environment, whichever dApp it names. */
    listClients(): Promise<ManagedClient[]>;
}

export const AUTH0_PROVISIONER = Symbol("AUTH0_PROVISIONER");

export type ProvisioningErrorKind = "rejected" | "failed" | "tag_mismatch";

export class ProvisioningError extends Error {
    constructor(
        readonly kind: ProvisioningErrorKind,
        message: string,
    ) {
        super(message);
        this.name = "ProvisioningError";
    }
}
