import type { HttpStatus } from "@nestjs/common";
import type { AuthErrorCode } from "../../auth/error/auth-error-codes";
import { AuthErrorBody } from "../../auth/error/auth-error-codes";
import type { CommonErrorCode } from "./common-error-codes";
import { CommonErrorBody } from "./common-error-codes";

export type ErrorDefinition = { status: HttpStatus; message: string };

export type ConsoleErrorCode = CommonErrorCode | AuthErrorCode;

export const ERROR_CODES: Record<ConsoleErrorCode, ErrorDefinition> = { ...CommonErrorBody, ...AuthErrorBody };
