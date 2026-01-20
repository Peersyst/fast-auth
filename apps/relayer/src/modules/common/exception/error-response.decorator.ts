import { ApiExtraModels } from "@nestjs/swagger";
import { applyDecorators } from "@nestjs/common";
import { ApiException } from "@backend/core/exceptions";

/**
 * Applies the `applyDecorators`.
 * @returns The API error decorators.
 */
export function ApiErrorDecorators(): ClassDecorator {
    return applyDecorators(ApiExtraModels(ApiException));
}
