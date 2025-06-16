import { FastAuthSignerErrorCodes } from "./signer.error-codes";

export class FastAuthSignerError extends Error {
    constructor(code: FastAuthSignerErrorCodes) {
        super(code.toString());
        this.name = "FastAuthSignerError";
    }
}
