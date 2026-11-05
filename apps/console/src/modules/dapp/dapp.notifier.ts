import { Inject, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Dapp, DappEvent } from "@database/console/entities";
import { DappEventDetails, DappEventType, EmailTemplate } from "@shared/modules/dapp";
import { describeError } from "./dapp-lifecycle.service";
import { AdminAlertKind, ConsoleEmail } from "../notification/interfaces/i-emailer.service";
import type { IEmailerService } from "../notification/interfaces/i-emailer.service";
import { SlackAlert } from "../notification/interfaces/i-slack-notifier.service";
import type { ISlackNotifierService } from "../notification/interfaces/i-slack-notifier.service";
import { EMAILER, SLACK_NOTIFIER } from "../notification/notification.tokens";
import { DappMetricsProvider } from "./dapp.metrics";
import { clientIdOf } from "./dapp-lifecycle.service";
import { SYSTEM } from "./types/actor";

/**
 * Reads a rejected dApp's rejection reason, throwing when it has none.
 * @param dapp The rejected dApp.
 * @returns The reason.
 */
function rejectionReasonOf(dapp: Dapp): string {
    if (dapp.rejectionReason === null) throw new Error(`Rejected dApp ${dapp.id} has no rejection reason`);
    return dapp.rejectionReason;
}

@Injectable()
export class DappNotifier {
    private readonly logger = new Logger(DappNotifier.name);

    constructor(
        @InjectRepository(DappEvent) private readonly dappEventRepository: Repository<DappEvent>,
        private readonly metrics: DappMetricsProvider,
        @Inject(EMAILER) private readonly emailer: IEmailerService,
        @Inject(SLACK_NOTIFIER) private readonly slack: ISlackNotifierService,
        @Inject(ConfigService) private readonly configService: ConfigService,
    ) {}

    /**
     * Alerts the admins by email and Slack that a dApp was submitted.
     * @param dapp The submitted dApp.
     */
    async submitted(dapp: Dapp): Promise<void> {
        await this.sendEmails([this.adminAlert(dapp, DappEventType.SUBMITTED)]);
        await this.notifySlack({ kind: DappEventType.SUBMITTED, dapp });
    }

    /**
     * Emails the owner that their dApp was auto-approved, with its Auth0 client id, then alerts the admins by email and Slack.
     * @param dapp The auto-approved dApp.
     */
    async autoApproved(dapp: Dapp): Promise<void> {
        await this.sendEmails([
            { template: EmailTemplate.DAPP_APPROVED, to: dapp.ownerEmail, dapp, clientId: clientIdOf(dapp) },
            this.adminAlert(dapp, DappEventType.AUTO_APPROVED),
        ]);
        await this.notifySlack({ kind: DappEventType.AUTO_APPROVED, dapp });
    }

    /**
     * Alerts the admins by email and Slack that a rejected dApp was resubmitted.
     * @param dapp The resubmitted dApp.
     * @param rejected The dApp as it was when rejected.
     */
    async resubmitted(dapp: Dapp, rejected: Dapp): Promise<void> {
        await this.sendEmails([this.adminAlert(dapp, DappEventType.RESUBMITTED)]);
        await this.notifySlack({ kind: DappEventType.RESUBMITTED, dapp, rejected, rejectionReason: rejectionReasonOf(rejected) });
    }

    /**
     * Alerts the admins by email that an approved dApp's owner requested a change.
     * @param dapp The dApp with its pending change.
     */
    async changeRequested(dapp: Dapp): Promise<void> {
        await this.sendEmails([this.adminAlert(dapp, DappEventType.CHANGE_REQUESTED)]);
    }

    /**
     * Emails the owner that their dApp was approved, with its Auth0 client id.
     * @param dapp The approved dApp.
     */
    async approved(dapp: Dapp): Promise<void> {
        await this.sendEmails([{ template: EmailTemplate.DAPP_APPROVED, to: dapp.ownerEmail, dapp, clientId: clientIdOf(dapp) }]);
    }

    /**
     * Emails the owner that their dApp was rejected and why.
     * @param dapp The rejected dApp.
     * @param reason Why it was rejected.
     */
    async rejected(dapp: Dapp, reason: string): Promise<void> {
        await this.sendEmails([{ template: EmailTemplate.DAPP_REJECTED, to: dapp.ownerEmail, dapp, reason }]);
    }

    /**
     * Emails the owner that their dApp's change was approved.
     * @param dapp The updated dApp.
     */
    async changeApproved(dapp: Dapp): Promise<void> {
        await this.sendEmails([{ template: EmailTemplate.CHANGE_APPROVED, to: dapp.ownerEmail, dapp }]);
    }

    /**
     * Emails the owner that their dApp's change was rejected and why.
     * @param dapp The dApp.
     * @param reason Why the change was rejected.
     */
    async changeRejected(dapp: Dapp, reason: string): Promise<void> {
        await this.sendEmails([{ template: EmailTemplate.CHANGE_REJECTED, to: dapp.ownerEmail, dapp, reason }]);
    }

    /**
     * Emails the owner that an admin edited their dApp.
     * @param dapp The edited dApp.
     */
    async editedByAdmin(dapp: Dapp): Promise<void> {
        await this.sendEmails([{ template: EmailTemplate.CHANGED_BY_ADMIN, to: dapp.ownerEmail, dapp }]);
    }

    /**
     * Emails the owner that an admin removed their dApp and why.
     * @param dapp The removed dApp.
     * @param reason Why it was removed.
     */
    async removedByAdmin(dapp: Dapp, reason: string): Promise<void> {
        await this.sendEmails([{ template: EmailTemplate.REMOVED_BY_ADMIN, to: dapp.ownerEmail, dapp, reason }]);
    }

    /**
     * Addresses an admin alert to every configured admin.
     * @param dapp The dApp.
     * @param kind What happened to the dApp.
     * @returns The email.
     */
    private adminAlert(dapp: Dapp, kind: AdminAlertKind): ConsoleEmail {
        return { template: EmailTemplate.ADMIN_ALERT, to: [...this.configService.get<string[]>("admin.emails")!], dapp, kind };
    }

    /**
     * Sends each email and records email_sent or email_failed. Neither a failed send nor a failed record throws.
     * @param emails The emails to send.
     */
    private async sendEmails(emails: ConsoleEmail[]): Promise<void> {
        for (const email of emails) {
            let event: DappEventDetails;
            try {
                await this.emailer.send(email);
                event = { type: DappEventType.EMAIL_SENT, details: { template: email.template } };
            } catch (error) {
                this.logger.warn(`Email ${email.template} for dApp ${email.dapp.id} failed: ${describeError(error)}`);
                event = {
                    type: DappEventType.EMAIL_FAILED,
                    details: { template: email.template, error: error instanceof Error ? error.message : String(error) },
                };
            }
            this.metrics.countEmail(email.template, event.type === DappEventType.EMAIL_SENT ? "sent" : "failed");
            try {
                await this.dappEventRepository.insert({
                    dappId: email.dapp.id,
                    type: event.type,
                    details: event.details,
                    actorEmail: SYSTEM.email,
                    actorRole: SYSTEM.role,
                });
            } catch (error) {
                this.logger.error(
                    `Could not record ${event.type} for dApp ${email.dapp.id}`,
                    error instanceof Error ? error.stack : String(error),
                );
            }
        }
    }

    /**
     * Sends a Slack alert, logging instead of throwing when it fails.
     * @param alert The alert.
     */
    private async notifySlack(alert: SlackAlert): Promise<void> {
        try {
            await this.slack.notify(alert);
        } catch (error) {
            this.logger.warn(`Slack alert ${alert.kind} for dApp ${alert.dapp.id} failed: ${describeError(error)}`);
        }
    }
}
