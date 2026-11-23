import { Dapp } from "@database/console/entities";
import { DappFields } from "@shared/modules/dapp";
import { Role } from "../../auth/types/session-user";

export enum AdminAlertKind {
    DAPP_SUBMITTED = "dapp_submitted",
    CHANGE_REQUESTED = "change_requested",
    DAPP_DELETED = "dapp_deleted",
    CLIENT_ORPHANED = "client_orphaned",
}

export enum OrphanReason {
    DAPP_DELETED = "dapp_deleted",
    DAPP_REVIEWED = "dapp_reviewed",
    CLIENT_REPLACED = "client_replaced",
}

/**
 * `change` holds only the fields the owner's edit changes. `dapp` holds the live fields, or the fields the dApp had when it was
 * deleted. `deletedBy` is the role of the caller who deleted it. `clientId` is the Auth0 client an approval created that no dApp
 * holds, and `reason` is what happened to the dApp meanwhile: it was deleted, so `dapp` holds the fields the approval read, or it
 * was reviewed or got the client of another approval, so `dapp` holds it as stored now.
 */
export type SlackAlert =
    | { kind: AdminAlertKind.DAPP_SUBMITTED; dapp: Dapp }
    | { kind: AdminAlertKind.CHANGE_REQUESTED; dapp: Dapp; change: Partial<DappFields> }
    | { kind: AdminAlertKind.DAPP_DELETED; dapp: Dapp; deletedBy: Role }
    | { kind: AdminAlertKind.CLIENT_ORPHANED; dapp: Dapp; clientId: string; reason: OrphanReason };

export interface ISlackNotifierService {
    notify(alert: SlackAlert): Promise<void>;
}
