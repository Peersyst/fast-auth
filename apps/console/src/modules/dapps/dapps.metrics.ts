import { Injectable } from "@nestjs/common";
import { InjectMetric } from "@willsoto/nestjs-prometheus";
import { Counter } from "prom-client";
import type { DappAction } from "@shared/console-domain/dapp-transitions";
import type { EmailTemplate } from "@shared/console-domain/dapp-event";
import type { ConsoleErrorCode } from "../common/exception/error-codes";

export type TransitionAction = DappAction | "submit" | "autoApprove";

export enum DappsMetric {
    TRANSITIONS = "console_transitions_total",
    EMAILS = "console_emails_total",
}

@Injectable()
export class DappsMetrics {
    constructor(
        @InjectMetric(DappsMetric.TRANSITIONS) private readonly transitions: Counter<string>,
        @InjectMetric(DappsMetric.EMAILS) private readonly emails: Counter<string>,
    ) {}

    /**
     * Counts one run of a use case.
     * @param action The use case.
     * @param result The outcome, as success, the error code it refused with, or error for an unexpected failure.
     */
    countTransition(action: TransitionAction, result: "success" | "error" | ConsoleErrorCode): void {
        this.transitions.inc({ action, result });
    }

    /**
     * Counts one email send attempt.
     * @param template The email template.
     * @param result Whether the email was sent.
     */
    countEmail(template: EmailTemplate, result: "sent" | "failed"): void {
        this.emails.inc({ template, result });
    }
}
