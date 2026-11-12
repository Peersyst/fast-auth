import { Dapp } from "@database/console/entities";

export enum AdminAlertKind {
    DAPP_SUBMITTED = "dapp_submitted",
}

export type SlackAlert = { kind: AdminAlertKind; dapp: Dapp };

export interface ISlackNotifierService {
    notify(alert: SlackAlert): Promise<void>;
}
