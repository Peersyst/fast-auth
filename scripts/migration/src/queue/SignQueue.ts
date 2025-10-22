import Bull from "bull";
import { DelegateAction } from "@near-js/transactions";
import { MPCProvider } from "../provider/MPCProvider";
import { RelayQueue } from "./RelayQueue";
import { Queue } from "./Queue";

export const QUEUE_NAME = "sign-queue";

export type JobParams = {
    delegateAction: DelegateAction;
};

export class SignQueue extends Queue<JobParams> {
    constructor(
        config: Bull.QueueOptions,
        private readonly relayQueue: RelayQueue,
        private readonly mpcProvider: MPCProvider,
        private readonly bypassJwt: string,
    ) {
        super(QUEUE_NAME, config);
    }

    /**
     *
     * @param job
     */
    async _process(job: Bull.Job<JobParams>): Promise<void> {
        const signResponse = await this.mpcProvider.sign(this.bypassJwt, job.data.delegateAction);
        await this.relayQueue.add({ delegateAction: job.data.delegateAction, signature: signResponse.signature });
    }
}
