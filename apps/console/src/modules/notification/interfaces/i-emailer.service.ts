import { Dapp } from "@database/console/entities";
import { DappEventType, EmailTemplate } from "@shared/modules/dapp";

export type AdminAlertKind =
    | typeof DappEventType.SUBMITTED
    | typeof DappEventType.AUTO_APPROVED
    | typeof DappEventType.RESUBMITTED
    | typeof DappEventType.CHANGE_REQUESTED;

export type ConsoleEmail =
    | { template: typeof EmailTemplate.DAPP_APPROVED; to: string; dapp: Dapp; clientId: string }
    | { template: typeof EmailTemplate.DAPP_REJECTED; to: string; dapp: Dapp; reason: string }
    | { template: typeof EmailTemplate.CHANGE_APPROVED; to: string; dapp: Dapp }
    | { template: typeof EmailTemplate.CHANGE_REJECTED; to: string; dapp: Dapp; reason: string }
    | { template: typeof EmailTemplate.CHANGED_BY_ADMIN; to: string; dapp: Dapp }
    | { template: typeof EmailTemplate.REMOVED_BY_ADMIN; to: string; dapp: Dapp; reason: string }
    | { template: typeof EmailTemplate.ADMIN_ALERT; to: string[]; dapp: Dapp; kind: AdminAlertKind };

export interface IEmailerService {
    send(email: ConsoleEmail): Promise<void>;
}
