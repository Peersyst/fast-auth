import { FastAuthClientErrorCodes } from "./client.error-codes";

export class FastAuthClientError extends Error {
    constructor(code: FastAuthClientErrorCodes) {
        super(code.toString());
        this.name = "FastAuthClientError";
    }
}
