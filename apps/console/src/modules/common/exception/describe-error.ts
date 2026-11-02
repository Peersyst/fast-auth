import { QueryFailedError } from "typeorm";
import { DappsErrorCode } from "../../dapps/error/dapps-error-codes";
import { ConsoleException } from "./console.exception";
import type { ConsoleErrorCode } from "./error-codes";

/**
 * Maps the database errors a dApp write can expect, a second live dApp for one email or a row lock timeout, to their error code.
 * @param exception The thrown value.
 * @returns The error code, or undefined for any other error.
 */
export function postgresErrorCode(exception: unknown): ConsoleErrorCode | undefined {
    if (!(exception instanceof QueryFailedError)) return undefined;
    const { code, constraint } = exception.driverError as { code?: string; constraint?: string };
    if (code === "23505" && constraint === "dapps_owner_email_live") return DappsErrorCode.DAPP_ALREADY_EXISTS;
    if (code === "55P03") return DappsErrorCode.DAPP_CHANGED;
    return undefined;
}

/**
 * Reads the error code a thrown value maps to, including the database errors the exception filter maps.
 * @param error The thrown value.
 * @returns The error code, or undefined when it maps to none.
 */
export function consoleCode(error: unknown): ConsoleErrorCode | undefined {
    return error instanceof ConsoleException ? error.code : postgresErrorCode(error);
}

/**
 * Describes a thrown value for a log line by its error code, or by its name and driver code, never by its message.
 * @param error The thrown value.
 * @returns The description.
 */
export function describeError(error: unknown): string {
    const consoleErrorCode = consoleCode(error);
    if (consoleErrorCode !== undefined) return consoleErrorCode;
    if (!(error instanceof Error)) return typeof error;
    const code = "code" in error ? error.code : undefined;
    return typeof code === "string" ? `${error.name} (${code})` : error.name;
}
