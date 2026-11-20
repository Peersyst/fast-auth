import { Dapp } from "@database/console/entities";
import { DappFields } from "@shared/modules/dapp";
import { Role } from "../../auth/types/session-user";

export enum AdminAlertKind {
    DAPP_SUBMITTED = "dapp_submitted",
    CHANGE_REQUESTED = "change_requested",
    DAPP_DELETED = "dapp_deleted",
}

/**
 * `change` holds only the fields the owner's edit changes. `dapp` holds the live fields, or the fields the dApp had when it was
 * deleted. `deletedBy` is the role of the caller who deleted it.
 */
export type SlackAlert =
    | { kind: AdminAlertKind.DAPP_SUBMITTED; dapp: Dapp }
    | { kind: AdminAlertKind.CHANGE_REQUESTED; dapp: Dapp; change: Partial<DappFields> }
    | { kind: AdminAlertKind.DAPP_DELETED; dapp: Dapp; deletedBy: Role };

export interface ISlackNotifierService {
    notify(alert: SlackAlert): Promise<void>;
}
