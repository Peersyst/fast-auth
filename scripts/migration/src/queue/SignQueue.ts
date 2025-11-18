import Bull from "bull";
import { DelegateAction, SCHEMA } from "@near-js/transactions";
import { MPCProvider } from "../provider/MPCProvider";
import { RelayQueue } from "./RelayQueue";
import { Queue } from "./Queue";
import { serialize } from "near-api-js/lib/utils";

export const QUEUE_NAME = "sign-queue";

export type JobParams = {
    serializedDelegateAction: string;
    jwt: string;
};

export class SignQueue extends Queue<JobParams> {
    constructor(
        config: Bull.QueueOptions,
        private readonly relayQueue: RelayQueue,
        private readonly mpcProvider: MPCProvider,
    ) {
        super(QUEUE_NAME, config);
    }

    /**
     *
     * @param job
     */
    async _process(job: Bull.Job<JobParams>): Promise<void> {
        const delegateAction = serialize.deserialize(
            SCHEMA.DelegateAction,
            Uint8Array.from(Buffer.from(job.data.serializedDelegateAction, "base64")),
            true,
        ) as DelegateAction;
        const signResponse = await this.mpcProvider.sign(job.data.jwt, delegateAction);
        await this.relayQueue.add({
            serializedDelegateAction: job.data.serializedDelegateAction,
            signature: signResponse.signature,
        });
    }
}
