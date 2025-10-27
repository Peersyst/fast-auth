import { FinalExecutionOutcome } from "near-api-js/lib/providers";
import { SignatureRequest } from "../signers"

export type RelayTransactionSignatureRequest = SignatureRequest

export type RelayTransactionSignatureResponse = {
    hash: string;
    result: FinalExecutionOutcome;
}

export type RelayDelegateActionSignatureRequest = SignatureRequest & {
    receiverId: string;
}

export type RelayDelegateActionSignatureResponse = {
    hash: string;
    result: FinalExecutionOutcome;
}

export type RelayCreateAccountRequest = {
    accountId: string;
    publicKey: string;
}

export type RelayCreateAccountResponse = {
    hash: string;
    result: FinalExecutionOutcome;
}