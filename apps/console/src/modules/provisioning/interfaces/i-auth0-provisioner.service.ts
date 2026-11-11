import { SyncedFields } from "@shared/modules/dapp";

export interface IAuth0ProvisionerService {
    findClient(dappId: string): Promise<string | null>;
    /** Can create the client even when it throws, so find it before creating again. */
    createClient(dappId: string, input: SyncedFields): Promise<string>;
    updateClient(dappId: string, clientId: string, input: SyncedFields): Promise<void>;
    /** Resolves when Auth0 answers that the client does not exist. */
    deleteClient(dappId: string, clientId: string): Promise<void>;
}

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
