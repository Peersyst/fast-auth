import { Connection, ViewFunctionCallOptions } from "@near-js/accounts";
import { bytesJsonStringify } from "../utils/bytesJsonStringify";
import { PublicKey } from "near-api-js/lib/utils/key_pair";
import { CodeResult } from "near-api-js/lib/providers/provider";

export class FastAuthProvider {
    constructor(
        private readonly connection: Connection,
        private readonly mpcContractId: string,
        private readonly fastAuthContractId: string,
        private readonly fastAuthDomain: string,
    ) {}

    /**
     *
     * @param args
     */
    private validateArgs(args: any) {
        const isUint8Array = args.byteLength !== undefined && args.byteLength === args.length;
        if (isUint8Array) {
            return;
        }

        if (Array.isArray(args) || typeof args !== "object") {
            throw new Error("invalid arguments");
        }
    }

    /**
     *
     * @param root0
     */
    private async viewFunction({ contractId, methodName, args, blockQuery }: ViewFunctionCallOptions) {
        this.validateArgs(args);

        const encodedArgs = bytesJsonStringify(args);

        const result = await this.connection.provider.query<CodeResult>({
            request_type: "call_function",
            ...blockQuery,
            account_id: contractId,
            method_name: methodName,
            args_base64: encodedArgs.toString("base64"),
            sync_checkpoint: "earliest_available",
        });

        return JSON.parse(Buffer.from(result.result).toString());
    }

    /**
     *
     * @param provider
     * @param providerId
     */
    async getPublicKey(provider: string, providerId: string): Promise<PublicKey> {
        // Call the fast auth contract with the path
        const publicKey = await this.viewFunction({
            contractId: this.mpcContractId,
            methodName: "derived_public_key",
            args: { path: `jwt#https://${this.fastAuthDomain}/#${provider}|${providerId}`, predecessor: this.fastAuthContractId, domain_id: 1 },
        });

        return publicKey;
    }
}
