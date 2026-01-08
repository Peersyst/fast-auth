import { providers } from "near-api-js";
import { Provider } from "near-api-js/lib/providers";
import { AccessKeyView, CodeResult, FinalExecutionOutcome } from "near-api-js/lib/providers/provider";
import { QueryContractParams } from "../../types/near.types";
import { encodeFunctionCallArgs, parseFunctionCallReturn } from "../../utils/near-encoding.utils";
import { SignedTransaction } from "near-api-js/lib/transaction";

export class NearProviderService {
    private readonly provider: Provider;

    constructor(private readonly nodeUrl: string) {
        this.provider = new providers.JsonRpcProvider({ url: this.nodeUrl });
    }

    /**
     * Queries a contract.
     * @param params The parameters to query the contract.
     * @returns The result of the query.
     */
    async queryContract<R, A extends object>({ contractId, methodName, args, ...rest }: QueryContractParams<A>): Promise<R> {
        const res = await this.provider.query<CodeResult>({
            request_type: "call_function",
            account_id: contractId,
            method_name: methodName,
            args_base64: encodeFunctionCallArgs(args),
            ...rest,
        });

        return parseFunctionCallReturn<R>(res.result);
    }

    /**
     * Queries an access key.
     * @param accountId The account id.
     * @param publicKey The public key.
     * @returns The access key view.
     */
    queryAccessKey(accountId: string, publicKey: string): Promise<AccessKeyView> {
        return this.provider.query<AccessKeyView>({
            request_type: "view_access_key",
            finality: "final",
            account_id: accountId,
            public_key: publicKey,
        });
    }

    /**
     * Broadcast a transaction.
     * @param transaction The transaction to broadcast.
     * @returns The final execution outcome.
     */
    broadcastTransaction(transaction: SignedTransaction): Promise<FinalExecutionOutcome> {
        return this.provider.sendTransactionUntil(transaction, "FINAL");
    }
}
