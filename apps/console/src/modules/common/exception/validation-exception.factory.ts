import type { ValidationError } from "class-validator";
import type { ErrorDetail } from "../response/error.response";
import { ConsoleException } from "./console.exception";

function toDetails(errors: ValidationError[], parent?: string): ErrorDetail[] {
    return errors.flatMap((error) => {
        const field = parent ? `${parent}.${error.property}` : error.property;
        return [
            ...Object.keys(error.constraints ?? {}).map((constraint) => ({ field, constraint })),
            ...toDetails(error.children ?? [], field),
        ];
    });
}

export function validationExceptionFactory(errors: ValidationError[]): ConsoleException {
    return new ConsoleException("VALIDATION_FAILED", toDetails(errors));
}
