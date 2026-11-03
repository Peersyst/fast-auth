import type * as real from "../near-auth/near";

export * from "../near-auth/near";

export const broadcast: typeof real.broadcast = async (_network, signedTransaction) => {
    await new Promise((resolve) => setTimeout(resolve, 400));

    const { signerId, receiverId } = signedTransaction.transaction;
    return {
        final_execution_status: "EXECUTED_OPTIMISTIC",
        status: { SuccessValue: "" },
        transaction: { signer_id: signerId, receiver_id: receiverId, hash: "DEMO_BUILD_NOT_BROADCAST" },
        transaction_outcome: {
            id: "DEMO_BUILD_NOT_BROADCAST",
            outcome: {
                logs: ["near-auth demo build: this transaction was never sent to the network"],
                receipt_ids: [],
                gas_burnt: 0,
                tokens_burnt: "0",
                executor_id: signerId,
                status: { SuccessValue: "" },
            },
        },
        receipts_outcome: [],
    };
};
