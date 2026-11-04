import { createQueryClient } from "../../../src/app/query-client";
import { apiError, mockApi } from "../../utils/api";
import { ApiError, createApiClient, unwrap } from "../../../src/api/client";
import { errorMessage } from "../../../src/api/error-message";

describe("ApiError", () => {
    it("should carry the status, code and details of an error answer", async () => {
        mockApi({ "PUT /api/console/dapp/d1": apiError(400, "VALIDATION_FAILED", [{ field: "callbackUrls", constraint: "isUrlList" }]) });
        const body = {
            name: "Acme",
            description: "",
            logoUrl: "https://a.xyz/l.png",
            mauBracket: "lt1k" as const,
            callbackUrls: ["http://a.xyz"],
            logoutUrls: [],
            webOrigins: ["https://a.xyz"],
            contactEmail: "a@a.xyz",
            expectedVersion: 1,
        };

        const error = await unwrap(createApiClient().PUT("/api/console/dapp/{id}", { params: { path: { id: "d1" } }, body })).catch(
            (thrown: unknown) => thrown,
        );

        expect(error).toBeInstanceOf(ApiError);
        expect(error).toMatchObject({
            statusCode: 400,
            code: "VALIDATION_FAILED",
            details: [{ field: "callbackUrls", constraint: "isUrlList" }],
        });
    });

    it("should turn a body that is not the API's envelope into INTERNAL with the response's status", async () => {
        mockApi({ "GET /api/console/dapp": { status: 502, body: "<html>Bad gateway</html>" } });

        const error = await unwrap(createApiClient().GET("/api/console/dapp")).catch((thrown: unknown) => thrown);

        expect(error).toMatchObject({ statusCode: 502, code: "INTERNAL", details: [] });
    });

    it("should return the data of a success", async () => {
        mockApi({ "GET /api/console/config": { body: { auth0Domain: "login.example", auth0ClientId: "spa" } } });

        await expect(unwrap(createApiClient().GET("/api/console/config"))).resolves.toEqual({
            auth0Domain: "login.example",
            auth0ClientId: "spa",
        });
    });
});

describe("a query", () => {
    it.each([
        { status: 409, code: "DAPP_CHANGED", fetches: 1 },
        { status: 502, code: "PROVISIONING_FAILED", fetches: 4 },
    ] as const)("should be fetched $fetches time(s) when it gets a $status", async ({ status, code, fetches }) => {
        const api = mockApi({ "GET /api/console/dapp": apiError(status, code) });

        const error = await createQueryClient()
            .fetchQuery({ queryKey: ["dapp"], queryFn: () => unwrap(createApiClient().GET("/api/console/dapp")), retryDelay: 0 })
            .catch((thrown: unknown) => thrown);

        expect(error).toMatchObject({ statusCode: status, code });
        expect(api.sent("GET /api/console/dapp")).toHaveLength(fetches);
    });
});

describe("errorMessage", () => {
    it("should explain an API error by its code, not by the server's message", () => {
        const error = new ApiError({ statusCode: 409, code: "DAPP_CHANGED", message: "raw server message" });

        expect(errorMessage(error)).toBe("This dApp changed since you opened it. Reload to see the latest version, then try again.");
    });

    it("should explain a network failure", () => {
        expect(errorMessage(new TypeError("Failed to fetch"))).toBe(
            "The console could not be reached. Check your connection and try again.",
        );
    });

    it("should not blame the connection for any other error", () => {
        expect(errorMessage(new RangeError("Invalid array length"))).toBe("Something went wrong. Reload the page and try again.");
    });
});
