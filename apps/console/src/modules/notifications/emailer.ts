import type { Auth0ClientId, Dapp } from "../../domain/dapp";
import type { EmailTemplate } from "../../domain/dapp-event";

export type AdminAlertKind = "submitted" | "auto_approved" | "resubmitted" | "change_requested";

export type ConsoleEmail =
    | { template: typeof EmailTemplate.DappApproved; to: string; dapp: Dapp; clientId: Auth0ClientId }
    | { template: typeof EmailTemplate.DappRejected; to: string; dapp: Dapp; reason: string }
    | { template: typeof EmailTemplate.ChangeApproved; to: string; dapp: Dapp }
    | { template: typeof EmailTemplate.ChangeRejected; to: string; dapp: Dapp; reason: string }
    | { template: typeof EmailTemplate.ChangedByAdmin; to: string; dapp: Dapp }
    | { template: typeof EmailTemplate.RemovedByAdmin; to: string; dapp: Dapp; reason: string }
    | { template: typeof EmailTemplate.AdminAlert; to: string[]; dapp: Dapp; kind: AdminAlertKind };

export interface Emailer {
    send(email: ConsoleEmail): Promise<void>;
}

export const EMAILER = Symbol("EMAILER");
