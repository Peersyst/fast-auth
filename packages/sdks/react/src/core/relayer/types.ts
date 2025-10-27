import { FinalExecutionOutcome } from "near-api-js/lib/providers";
import { SignatureRequest } from "../signers"

export type RelaySignatureRequest = SignatureRequest

export type RelaySignatureResponse = {
    hash: string;
    result: FinalExecutionOutcome;
}

export type RelayCreateAccountRequest = {
    account_id: string;
    sub: string;
}

export type RelayCreateAccountResponse = {
    hash: string;
    result: FinalExecutionOutcome;
}