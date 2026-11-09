import { Dapp } from "@database/console/entities";
import { DappEventType, DappFields } from "@shared/modules/dapp";

export type AdminAlertKind =
    | typeof DappEventType.SUBMITTED
    | typeof DappEventType.AUTO_APPROVED
    | typeof DappEventType.RESUBMITTED
    | typeof DappEventType.CHANGE_REQUESTED;

export type SlackAlert =
    | { kind: Exclude<AdminAlertKind, typeof DappEventType.RESUBMITTED>; dapp: Dapp }
    | { kind: typeof DappEventType.RESUBMITTED; dapp: Dapp; rejected: DappFields };

export interface ISlackNotifierService {
    notify(alert: SlackAlert): Promise<void>;
}
