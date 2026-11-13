import { Dapp } from "@database/console/entities";
import { DappFields } from "@shared/modules/dapp";

export enum AdminAlertKind {
    DAPP_SUBMITTED = "dapp_submitted",
    CHANGE_REQUESTED = "change_requested",
}

/** `change` holds only the fields the owner's edit changes. `dapp` holds the live fields. */
export type SlackAlert =
    | { kind: AdminAlertKind.DAPP_SUBMITTED; dapp: Dapp }
    | { kind: AdminAlertKind.CHANGE_REQUESTED; dapp: Dapp; change: Partial<DappFields> };

export interface ISlackNotifierService {
    notify(alert: SlackAlert): Promise<void>;
}
