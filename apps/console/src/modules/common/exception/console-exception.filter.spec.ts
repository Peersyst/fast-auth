import { BadRequestException, HttpException, Logger, NotFoundException, ParseUUIDPipe } from "@nestjs/common";
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
        [400, "VALIDATION_FAILED"],
        [404, "NOT_FOUND"],
        [405, "VALIDATION_FAILED"],
        [406, "VALIDATION_FAILED"],
        [413, "VALIDATION_FAILED"],
        [415, "VALIDATION_FAILED"],
    ])("maps an OpenAPI validator error with status %i to %s, keeping the status", (status, code) => {
        const validatorError = Object.assign(new Error("request/body must have required property 'name'"), { status, errors: [] });

        expect(toBody(validatorError)).toEqual({ statusCode: status, code, message: "request/body must have required property 'name'" });
    });

    it("maps Nest HttpExceptions by status", async () => {
        const uuidError = await new ParseUUIDPipe().transform("not-a-uuid", { type: "param" }).catch((error: unknown) => error);

        expect(toBody(uuidError)).toMatchObject({ statusCode: 400, code: "VALIDATION_FAILED" });
        expect(toBody(new NotFoundException())).toMatchObject({ statusCode: 404, code: "NOT_FOUND" });
        expect(toBody(new BadRequestException())).toMatchObject({ statusCode: 400, code: "VALIDATION_FAILED" });
    });

    it.each([503, 418])("turns an HttpException with status %i, which has no console code, into INTERNAL", (status) => {
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
