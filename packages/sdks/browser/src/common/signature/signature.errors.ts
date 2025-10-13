import { FastAuthSignatureErrorCodes } from "./signature.error-codes";

export class FastAuthSignatureError extends Error {
    constructor(code: FastAuthSignatureErrorCodes) {
        super(code.toString());
        this.name = "FastAuthSignatureError";
    }
}