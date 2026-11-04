import type { Auth0ClientId, Dapp } from "@shared/console-domain/dapp";
import type { DappEventType, EmailTemplate } from "@shared/console-domain/dapp-event";

export type AdminAlertKind =
    | DappEventType.SUBMITTED
    | DappEventType.AUTO_APPROVED
    | DappEventType.RESUBMITTED
    | DappEventType.CHANGE_REQUESTED;

export type ConsoleEmail =
    | { template: EmailTemplate.DAPP_APPROVED; to: string; dapp: Dapp; clientId: Auth0ClientId }
    | { template: EmailTemplate.DAPP_REJECTED; to: string; dapp: Dapp; reason: string }
    | { template: EmailTemplate.CHANGE_APPROVED; to: string; dapp: Dapp }
    | { template: EmailTemplate.CHANGE_REJECTED; to: string; dapp: Dapp; reason: string }
    | { template: EmailTemplate.CHANGED_BY_ADMIN; to: string; dapp: Dapp }
    | { template: EmailTemplate.REMOVED_BY_ADMIN; to: string; dapp: Dapp; reason: string }
    | { template: EmailTemplate.ADMIN_ALERT; to: string[]; dapp: Dapp; kind: AdminAlertKind };

export interface Emailer {
    send(email: ConsoleEmail): Promise<void>;
}

export const EMAILER = Symbol("EMAILER");
