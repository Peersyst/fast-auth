import type { Dapp, DappFields } from "@shared/console-domain/dapp";

export type SlackAlert =
    | { kind: "submitted" | "auto_approved"; dapp: Dapp }
    | { kind: "resubmitted"; dapp: Dapp; rejected: DappFields; rejectionReason: string };

export type SlackAlertKind = SlackAlert["kind"];

export interface SlackNotifier {
    notify(alert: SlackAlert): Promise<void>;
}

export const SLACK_NOTIFIER = Symbol("SLACK_NOTIFIER");
