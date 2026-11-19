import { SyncedFields } from "@shared/modules/dapp";

/** The synced fields of a dApp's Auth0 client, with the dApp it is tagged with. */
export type DappClient = SyncedFields & { dappId: string };

export interface IAuth0ProvisionerService {
    /** Checks that the template has connections and user grants, then creates the client only. `update` configures it. */
    create(client: DappClient): Promise<string>;
    /**
     * Configures the client: writes the dApp's fields, sets its connections to exactly the template's and creates the
     * template's user grants it lacks. Safe to repeat.
     */
    update(clientId: string, client: DappClient): Promise<void>;
}

export type ProvisioningErrorKind = "rejected" | "failed";

export class ProvisioningError extends Error {
    constructor(
        readonly kind: ProvisioningErrorKind,
        message: string,
    ) {
        super(message);
        this.name = "ProvisioningError";
    }
}
