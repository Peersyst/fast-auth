import type { ValidationError } from "class-validator";
import type { ErrorDetail } from "../responses/error.response";
import { CommonErrorCode } from "./common-error-codes";
import { ConsoleException } from "./console.exception";

/**
 * Flattens class-validator errors into one detail per broken constraint, with nested fields dotted.
 * @param errors The validation errors.
 * @param parent The dotted path of the enclosing field, if any.
 * @returns The details.
 */
function toDetails(errors: ValidationError[], parent?: string): ErrorDetail[] {
    return errors.flatMap((error) => {
        const field = parent ? `${parent}.${error.property}` : error.property;
        return [
            ...Object.keys(error.constraints ?? {}).map((constraint) => ({ field, constraint })),
            ...toDetails(error.children ?? [], field),
        ];
    });
}

/**
 * Turns the global ValidationPipe's errors into a VALIDATION_FAILED exception.
 * @param errors The validation errors.
 * @returns The exception to throw.
 */
export function validationExceptionFactory(errors: ValidationError[]): ConsoleException {
    return new ConsoleException(CommonErrorCode.VALIDATION_FAILED, toDetails(errors));
}
