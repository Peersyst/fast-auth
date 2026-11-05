import { Dapp } from "@database/console/entities";
import { DappEventType, DappFields } from "@shared/modules/dapp";

export type SlackAlert =
    | { kind: typeof DappEventType.SUBMITTED | typeof DappEventType.AUTO_APPROVED; dapp: Dapp }
    | { kind: typeof DappEventType.RESUBMITTED; dapp: Dapp; rejected: DappFields; rejectionReason: string };

export interface ISlackNotifierService {
    notify(alert: SlackAlert): Promise<void>;
}
