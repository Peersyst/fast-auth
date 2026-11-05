import { ArgumentsHost, BadRequestException, HttpException, HttpStatus, NotFoundException } from "@nestjs/common";
import { ThrottlerException } from "@nestjs/throttler";
import { error as openApiError } from "express-openapi-validator";
import { BusinessException } from "../../../../src/modules/common/exception/business.exception";
import { BusinessExceptionFilter } from "../../../../src/modules/common/exception/business-exception.filter";
import { ErrorCode } from "../../../../src/modules/common/exception/error-codes";

describe("BusinessExceptionFilter", () => {
    const filter = new BusinessExceptionFilter();

    /**
     * Runs the filter on a thrown value and records what it answered.
     * @param exception The thrown value.
     * @returns The answer's status, headers and body.
     */
    const answer = (exception: unknown): { status: number; headers: Record<string, string>; body: unknown } => {
        const sent = { status: 0, headers: {} as Record<string, string>, body: undefined as unknown };
        const response = {
            header: (headers: Record<string, string>) => (Object.assign(sent.headers, headers), response),
            status: (status: number) => ((sent.status = status), response),
            json: (body: unknown) => ((sent.body = body), response),
        };
        filter.catch(exception, { switchToHttp: () => ({ getResponse: () => response }) } as unknown as ArgumentsHost);
        return sent;
    };

    beforeEach(() => {
        jest.spyOn(filter["logger"], "error").mockImplementation(() => undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("should answer a business exception with its own body", () => {
        expect(answer(new BusinessException(ErrorCode.DAPP_NOT_FOUND))).toEqual({
            status: 404,
            headers: {},
            body: { statusCode: 404, message: "DAPP_NOT_FOUND" },
        });
    });

    it("should answer a ValidationPipe refusal with VALIDATION_FAILED and the refused fields", () => {
        const refusal = new BadRequestException([
            "expectedVersion must not be less than 0",
            "expectedVersion must be an integer number",
            "autoApproval.enabled must be a boolean value",
            "property ownerEmail should not exist",
        ]);

        expect(answer(refusal).body).toEqual({
            statusCode: 400,
            message: "VALIDATION_FAILED",
            fields: ["expectedVersion", "autoApproval.enabled", "ownerEmail"],
        });
    });

    it("should answer an OpenAPI validator refusal with VALIDATION_FAILED and the refused fields", () => {
        const refusal = new openApiError.BadRequest({
            path: "/api/console/dapp",
            errors: [
                { path: "/body/name", message: "must be string" },
                { path: "/query/page", message: "must be integer" },
            ],
        });

        expect(answer(refusal).body).toEqual({ statusCode: 400, message: "VALIDATION_FAILED", fields: ["name", "page"] });
    });

    it("should answer a malformed JSON body with VALIDATION_FAILED and no fields", () => {
        const parseError = Object.assign(new SyntaxError("Unexpected token"), { status: 400, type: "entity.parse.failed" });

        expect(answer(parseError).body).toEqual({ statusCode: 400, message: "VALIDATION_FAILED" });
    });

    it.each([
        [
            "a missing bearer token",
            new openApiError.Unauthorized({ path: "/api/console/me", message: "Authorization header required" }),
            401,
            "UNAUTHENTICATED",
        ],
        ["a forbidden request", new HttpException("Forbidden resource", HttpStatus.FORBIDDEN), 403, "FORBIDDEN_ROLE"],
        ["an unknown route", new NotFoundException("Cannot GET /api/console/nowhere"), 404, "NOT_FOUND"],
        ["an unknown OpenAPI path", new openApiError.NotFound({ path: "/api/console/nowhere", message: "not found" }), 404, "NOT_FOUND"],
        [
            "an oversized body",
            Object.assign(new Error("request entity too large"), { status: 413, type: "entity.too.large" }),
            413,
            "PAYLOAD_TOO_LARGE",
        ],
        [
            "an unsupported content type",
            new openApiError.UnsupportedMediaType({ path: "/api/console/dapp", message: "unsupported" }),
            415,
            "UNSUPPORTED_MEDIA_TYPE",
        ],
        ["the throttler's own refusal", new ThrottlerException(), 429, "RATE_LIMITED"],
    ])("should answer %s with its status and code", (_name, exception, status, code) => {
        expect(answer(exception)).toEqual({ status, headers: {}, body: { statusCode: status, message: code } });
    });

    it("should answer a wrong method with METHOD_NOT_ALLOWED and keep the Allow header", () => {
        const wrongMethod = new openApiError.MethodNotAllowed({ path: "/api/console/livez", headers: { Allow: "GET" } });

        expect(answer(wrongMethod)).toEqual({
            status: 405,
            headers: { Allow: "GET" },
            body: { statusCode: 405, message: "METHOD_NOT_ALLOWED" },
        });
    });

    it.each([
        ["a crash", new TypeError("Cannot read properties of undefined")],
        ["a thrown string", "boom"],
        ["an HTTP status with no business code", new HttpException("I'm a teapot", HttpStatus.I_AM_A_TEAPOT)],
    ])("should answer %s with INTERNAL and log it", (_name, exception) => {
        expect(answer(exception)).toEqual({ status: 500, headers: {}, body: { statusCode: 500, message: "INTERNAL" } });
        expect(filter["logger"].error).toHaveBeenCalledTimes(1);
    });
});
