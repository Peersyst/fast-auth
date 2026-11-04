import { ApiDefaultResponse } from "@nestjs/swagger";
import { ErrorResponse } from "../responses/error.response";

/**
 * Documents the error envelope as the default response of a controller or route.
 * @returns The Swagger decorator.
 */
export function ApiErrorResponses(): MethodDecorator & ClassDecorator {
    return ApiDefaultResponse({ description: "Error", type: ErrorResponse });
}
