import type { HttpStatus } from "@nestjs/common";
import { CommonErrorCodes } from "./common-error-codes";

export type ErrorCodeDefinitions = Record<string, { status: HttpStatus; message: string }>;

export const ERROR_CODES = { ...CommonErrorCodes } as const satisfies ErrorCodeDefinitions;

export type ConsoleErrorCode = keyof typeof ERROR_CODES;
