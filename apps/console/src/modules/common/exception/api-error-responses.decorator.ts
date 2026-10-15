import { ApiDefaultResponse } from "@nestjs/swagger";
import { ErrorResponse } from "../response/error.response";

export function ApiErrorResponses(): MethodDecorator & ClassDecorator {
    return ApiDefaultResponse({ description: "Error", type: ErrorResponse });
}
