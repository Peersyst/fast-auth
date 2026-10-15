import { Injectable } from "@nestjs/common";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Counter } from "prom-client";
import type { DappAction } from "../../domain/dapp-transitions";
import type { EmailTemplate } from "../../domain/dapp-event";
import type { ConsoleErrorCode } from "../common/exception/error-codes";

export type TransitionAction = DappAction | "submit";

export const DappsMetric = {
    Transitions: "console_transitions_total",
    Emails: "console_emails_total",
} as const;

@Injectable()
export class DappsMetrics {
    constructor(
        @InjectMetric(DappsMetric.Transitions) private readonly transitions: Counter<string>,
        @InjectMetric(DappsMetric.Emails) private readonly emails: Counter<string>,
    ) {}

    countTransition(action: TransitionAction, result: "success" | "error" | ConsoleErrorCode): void {
        this.transitions.inc({ action, result });
    }

    countEmail(template: EmailTemplate, result: "sent" | "failed"): void {
        this.emails.inc({ template, result });
    }
}
