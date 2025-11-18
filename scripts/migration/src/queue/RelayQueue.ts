import Bull from "bull";
import { NearProvider } from "../provider/NearProvider";
import { Queue } from "./Queue";
import { serialize } from "near-api-js/lib/utils";
import { DelegateAction, SCHEMA } from "@near-js/transactions";

export const QUEUE_NAME = "relay-queue";

export type JobParams = {
    serializedDelegateAction: string;
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
        const delegateAction = serialize.deserialize(
            SCHEMA.DelegateAction,
            Uint8Array.from(Buffer.from(job.data.serializedDelegateAction, "base64")),
            true,
        ) as DelegateAction;
        const { result, hash } = await this.nearProvider.relayMetaTransaction(
            delegateAction.receiverId,
            delegateAction,
            job.data.signature,
        );
        if (result.status?.Failure) {
            throw new Error(JSON.stringify({ hash, result: result.status }));
        }
    }
}
