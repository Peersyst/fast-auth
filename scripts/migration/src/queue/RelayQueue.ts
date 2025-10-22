import Bull from "bull";
import { DelegateAction } from "@near-js/transactions";
import { NearProvider } from "../provider/NearProvider";
import { Queue } from "./Queue";

export const QUEUE_NAME = "relay-queue";

export type JobParams = {
    delegateAction: DelegateAction;
    signature: string;
};

export class RelayQueue extends Queue<JobParams> {
    constructor(
        config: Bull.QueueOptions,
        private readonly nearProvider: NearProvider,
    ) {
        super(QUEUE_NAME, config);
    }

    /**
     *
     * @param job
     */
    async _process(job: Bull.Job<JobParams>): Promise<void> {
        await this.nearProvider.relayMetaTransaction(job.data.delegateAction, job.data.signature);
    }
}
