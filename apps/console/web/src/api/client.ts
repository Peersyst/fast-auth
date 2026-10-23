import createClient from "openapi-fetch";
import type { components, paths } from "./schema.gen";

type Schemas = components["schemas"];
export type Me = Schemas["MeResponse"];
export type ClientConfig = Schemas["ClientConfigResponse"];
export type NearNetwork = ClientConfig["nearNetwork"];
export type ErrorCode = Schemas["ErrorCode"];
export type ErrorDetail = Schemas["ErrorDetail"];
type ErrorResponse = Schemas["ErrorResponse"];

export class ApiError extends Error implements ErrorResponse {
    readonly statusCode: number;
    readonly code: ErrorCode;
    readonly details: ErrorDetail[];

    constructor({ statusCode, code, message, details = [] }: ErrorResponse) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}

function isErrorResponse(body: unknown): body is ErrorResponse {
    return typeof body === "object" && body !== null && "code" in body && "statusCode" in body;
}

type FetchAnswer<T> = { data: T; error?: never; response: Response } | { error: unknown; response: Response };

// openapi-fetch sets `error` exactly when the response is not ok. `NoInfer` stops the error branch's `data?: never` from adding `undefined` to `T`.
export async function unwrap<T>(request: Promise<{ data?: T } & FetchAnswer<NoInfer<T>>>): Promise<T> {
    const answer = await request;
    if (!("error" in answer)) return answer.data;
    const { error, response } = answer;
    throw new ApiError(
        isErrorResponse(error)
            ? error
            : { statusCode: response.status, code: "INTERNAL", message: `Request failed with ${response.status}` },
    );
}

export function createApiClient(send: (request: Request) => Promise<Response> = (request) => fetch(request)) {
    return createClient<paths>({ baseUrl: window.location.origin, fetch: send });
}
