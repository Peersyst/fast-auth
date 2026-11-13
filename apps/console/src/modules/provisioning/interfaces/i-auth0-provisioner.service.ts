import { SyncedFields } from "@shared/modules/dapp";

/** The synced fields of a dApp's Auth0 client, with the dApp it is tagged with. */
export type DappClient = SyncedFields & { dappId: string };

export interface IAuth0ProvisionerService {
    /** Can create the client even when it throws. */
    create(client: DappClient): Promise<string>;
    update(clientId: string, client: DappClient): Promise<void>;
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
