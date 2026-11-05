import { AnyObject } from "@swisstype/essential";
import { isApiError } from "../../data-access/api/error/is-api-error";

export type DomainErrorSeverity = "error" | "warning";

export interface DomainErrorOptions {
    message: string;
    severity?: DomainErrorSeverity;
    data?: AnyObject;
}

export class DomainError extends Error {
    message: string;
    severity: DomainErrorSeverity;
    data?: AnyObject;

    constructor(message: string, severity: DomainErrorSeverity = "error", data?: AnyObject) {
        super(message);

        this.name = "DomainError";
        this.message = message;
        this.severity = severity;
        this.data = data;
    }

    /**
     * Creates a DomainError from a `DomainErrorOptions` object.
     * @param options The error options.
     * @returns The DomainError.
     */
    static fromOptions(options: DomainErrorOptions): DomainError {
        return new DomainError(options.message, options.severity, options.data);
    }

    /**
     * Creates a DomainError from an ApiError.
     * @param error Any error.
     * @param handlers Handlers for especific ApiError codes coming from the backend. If no handler is provided for a code, the error will be UNKNOWN_ERROR.
     * @returns The corresponding DomainError.
     */
    static fromApiError(error: any, handlers: Record<string, string | [string, DomainErrorSeverity]> = {}): DomainError {
        if (isApiError(error)) {
            const errorBodyMessage = handlers[error.body.message];
            const [errorMessage, errorSeverity] = Array.isArray(errorBodyMessage) ? errorBodyMessage : [errorBodyMessage, "error" as const];
            return new DomainError(errorMessage || "unknownError", errorSeverity);
        }
        return new DomainError("unknownError");
    }
}
