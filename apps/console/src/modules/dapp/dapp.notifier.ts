import { Inject, Injectable, Logger } from "@nestjs/common";
import { Dapp } from "@database/console/entities";
import { DappEventType } from "@shared/modules/dapp";
import { describeError } from "./dapp-write.service";
import { SlackAlert } from "../notification/interfaces/i-slack-notifier.service";
import type { ISlackNotifierService } from "../notification/interfaces/i-slack-notifier.service";
import { SLACK_NOTIFIER } from "../notification/notification.tokens";

@Injectable()
export class DappNotifier {
    private readonly logger = new Logger(DappNotifier.name);

    constructor(@Inject(SLACK_NOTIFIER) private readonly slack: ISlackNotifierService) {}

    /**
     * Alerts the admins on Slack that a dApp was submitted.
     * @param dapp The submitted dApp.
     */
    async submitted(dapp: Dapp): Promise<void> {
        await this.notifySlack({ kind: DappEventType.SUBMITTED, dapp });
    }

    /**
     * Alerts the admins on Slack that a dApp was auto-approved.
     * @param dapp The auto-approved dApp.
     */
    async autoApproved(dapp: Dapp): Promise<void> {
        await this.notifySlack({ kind: DappEventType.AUTO_APPROVED, dapp });
    }

    /**
     * Alerts the admins on Slack that a rejected dApp was resubmitted.
     * @param dapp The resubmitted dApp.
     * @param rejected The dApp as it was when rejected.
     */
    async resubmitted(dapp: Dapp, rejected: Dapp): Promise<void> {
        await this.notifySlack({ kind: DappEventType.RESUBMITTED, dapp, rejected });
    }

    /**
     * Alerts the admins on Slack that an approved dApp's owner requested a change.
     * @param dapp The dApp with its pending change.
     */
    async changeRequested(dapp: Dapp): Promise<void> {
        await this.notifySlack({ kind: DappEventType.CHANGE_REQUESTED, dapp });
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
