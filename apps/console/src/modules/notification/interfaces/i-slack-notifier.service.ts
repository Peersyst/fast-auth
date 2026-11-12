import { Dapp } from "@database/console/entities";

export enum AdminAlertKind {
    DAPP_SUBMITTED = "dapp_submitted",
    AUTO_APPROVED = "auto_approved",
    AUTH0_FAILED = "auth0_failed",
}

export type SlackAlert =
    | { kind: AdminAlertKind.DAPP_SUBMITTED | AdminAlertKind.AUTO_APPROVED; dapp: Dapp }
    | { kind: AdminAlertKind.AUTH0_FAILED; dapp: Dapp; error: string };

export interface ISlackNotifierService {
    notify(alert: SlackAlert): Promise<void>;
}
