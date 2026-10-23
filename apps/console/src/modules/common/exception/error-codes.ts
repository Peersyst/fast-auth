import type { HttpStatus } from "@nestjs/common";
import { AuthErrorCodes } from "../../auth/error/auth-error-codes";
import { DappsErrorCodes } from "../../dapps/error/dapps-error-codes";
import { CommonErrorCodes } from "./common-error-codes";

export type ErrorCodeDefinitions = Record<string, { status: HttpStatus; message: string }>;

export const ERROR_CODES = { ...CommonErrorCodes, ...AuthErrorCodes, ...DappsErrorCodes } as const satisfies ErrorCodeDefinitions;

export type ConsoleErrorCode = keyof typeof ERROR_CODES;
