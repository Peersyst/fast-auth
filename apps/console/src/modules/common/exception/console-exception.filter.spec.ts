import { BadRequestException, HttpException, Logger, NotFoundException, ParseUUIDPipe } from "@nestjs/common";
import { error as OpenApiError } from "express-openapi-validator";
import { ConsoleException } from "./console.exception";
import { ConsoleExceptionFilter } from "./console-exception.filter";
import { validationExceptionFactory } from "./validation-exception.factory";

describe("ConsoleExceptionFilter", () => {
    const filter = new ConsoleExceptionFilter();
    const toBody = (exception: unknown) => filter.toErrorResponse(exception, "request-1");

    let log: jest.SpyInstance;

    beforeAll(() => {
        log = jest.spyOn(Logger.prototype, "error").mockImplementation(() => undefined);
    });

    afterAll(() => {
        log.mockRestore();
    });

    it("passes a ConsoleException's envelope through, details included", () => {
        const details = [{ field: "name", constraint: "maxLength" }];

        expect(toBody(new ConsoleException("VALIDATION_FAILED", details))).toEqual({
            statusCode: 400,
            code: "VALIDATION_FAILED",
            message: "The request is invalid.",
            details,
        });
    });

    it.each([
        [400, "VALIDATION_FAILED", "The request is invalid."],
        [401, "UNAUTHENTICATED", "A valid ID token is required."],
        [404, "NOT_FOUND", "Not found."],
        [405, "VALIDATION_FAILED", "The request is invalid."],
        [413, "VALIDATION_FAILED", "The request is invalid."],
        [415, "VALIDATION_FAILED", "The request is invalid."],
    ])("maps an error carrying status %i to %s with the code's own message, keeping the status", (status, code, message) => {
        const error = Object.assign(new Error(`Unexpected token 'a', "{"secretToken": abc}" is not valid JSON`), { status });

        expect(toBody(error)).toEqual({ statusCode: status, code, message });
    });

    it("turns the OpenAPI validator's 400 errors into details", () => {
        const validatorError = new OpenApiError.BadRequest({
            path: "/body/autoApproval/enabled",
            message: "request/body/autoApproval/enabled must be boolean",
            errors: [
                { path: "/body/autoApproval/enabled", message: "must be boolean", errorCode: "type.openapi.validation" },
                { path: "/body", message: "must be object", errorCode: "type.openapi.validation" },
                { path: "/query/foo", message: "Unknown query parameter 'foo'" },
            ],
        });

        expect(toBody(validatorError)).toEqual({
            statusCode: 400,
            code: "VALIDATION_FAILED",
            message: "The request is invalid.",
            details: [
                { field: "autoApproval.enabled", constraint: "type" },
                { field: "body", constraint: "type" },
                { field: "foo", constraint: "invalid" },
            ],
        });
    });

    it.each([
        ["a malformed URI", "/dapps/%E0%A4%A"],
        ["a dotted query path", ".query.limit"],
    ])("leaves details out for a validator error on %s, which names no field", (_case, path) => {
        const validatorError = new OpenApiError.BadRequest({ path, message: "request is malformed" });

        expect(toBody(validatorError)).toEqual({ statusCode: 400, code: "VALIDATION_FAILED", message: "The request is invalid." });
    });

    it("maps Nest HttpExceptions by status", async () => {
        const uuidError = await new ParseUUIDPipe().transform("not-a-uuid", { type: "param" }).catch((error: unknown) => error);

        expect(toBody(uuidError)).toMatchObject({ statusCode: 400, code: "VALIDATION_FAILED" });
        expect(toBody(new NotFoundException())).toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
        expect(toBody(new BadRequestException())).toMatchObject({ statusCode: 400, code: "VALIDATION_FAILED" });
    });

    it.each([503, 418])("turns an HttpException with status %i, which the status table does not map, into INTERNAL", (status) => {
        expect(toBody(new HttpException("Service Unavailable", status))).toEqual({
            statusCode: 500,
            code: "INTERNAL",
            message: "Internal error.",
        });
    });

    it("turns an error without a status into INTERNAL, logged with the request id", () => {
        expect(toBody(new TypeError("boom"))).toEqual({ statusCode: 500, code: "INTERNAL", message: "Internal error." });
        expect(log).toHaveBeenCalledWith(expect.stringContaining("request-1"), expect.stringContaining("boom"));
    });
});

describe("validationExceptionFactory", () => {
    it("gives VALIDATION_FAILED with one detail per broken constraint, nested fields dotted", () => {
        const exception = validationExceptionFactory([
            { property: "name", constraints: { isString: "", maxLength: "" }, children: [] },
            { property: "autoApproval", children: [{ property: "enabled", constraints: { isBoolean: "" }, children: [] }] },
        ]);

        expect(exception.getResponse()).toEqual({
            statusCode: 400,
            code: "VALIDATION_FAILED",
            message: "The request is invalid.",
            details: [
                { field: "name", constraint: "isString" },
                { field: "name", constraint: "maxLength" },
                { field: "autoApproval.enabled", constraint: "isBoolean" },
            ],
        });
    });
});
