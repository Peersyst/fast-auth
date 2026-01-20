import { FinalExecutionOutcome } from "near-api-js/lib/providers";

export class SignResponse {
    hash: string;
    result: FinalExecutionOutcome;
}
