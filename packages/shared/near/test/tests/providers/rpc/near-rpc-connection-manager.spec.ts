import { TypedError } from "near-api-js/lib/providers";
import { NearRPCConnectionManager } from "../../../../src/rpc/near-rpc-connection-manager";
import { NearRPCErrors } from "../../../../src/rpc/error/near-rpc.errors";

describe("NearRPCConnectionManager", () => {
    describe("constructor", () => {
        it("should throw an error if an invalid RPC URL is provided", () => {
            expect(
                () =>
                    new NearRPCConnectionManager({
                        nodeUrls: ["invalid-url"],
                        wait: 500,
                        retries: 3,
                        backoff: 2,
                    }),
            ).toThrow(new TypedError("Invalid RPC URL", NearRPCErrors.INVALID_RPC_URL));
        });

        it("should throw an error if no RPC URLs are provided", () => {
            expect(
                () =>
                    new NearRPCConnectionManager({
                        nodeUrls: [],
                        wait: 500,
                        retries: 3,
                        backoff: 2,
                    }),
            ).toThrow(new TypedError("No RPC URL provided", NearRPCErrors.NO_RPC_URL_PROVIDED));
        });
    });

    describe("class methods", () => {
        let manager: NearRPCConnectionManager;

        beforeEach(() => {
            manager = new NearRPCConnectionManager({
                nodeUrls: ["http://valid-rpc1.com", "http://valid-rpc2.com"],
                wait: 100,
                retries: 3,
                backoff: 2,
            });
        });
        describe("getProvider", () => {
            it("should return the Near JsonRpcProvider instance", () => {
                expect(manager.getProvider()).toBeDefined();
                expect(manager.getProvider().connection.url).toBe("http://valid-rpc1.com");
            });
        });

        describe("updateRPCUrl", () => {
            it("should update the current RPC URL", () => {
                manager["updateRPCUrl"]("http://valid-rpc2.com");
                expect(manager.getProvider().connection.url).toBe("http://valid-rpc2.com");
            });
        });

        describe("switchToNextRPC", () => {
            it("should switch to the next RPC URL", () => {
                manager["switchToNextRPC"]();
                expect(manager.getProvider().connection.url).toBe("http://valid-rpc2.com");
            });

            it("should switch to the first RPC URL if the last one was used", () => {
                manager["switchToNextRPC"]();
                expect(manager.getProvider().connection.url).toBe("http://valid-rpc2.com");
                manager["switchToNextRPC"]();
                expect(manager.getProvider().connection.url).toBe("http://valid-rpc1.com");
            });
        });

        describe("shouldSwitchRpc", () => {
            it("should return true if the health check fails", async () => {
                manager["lastSwitchTimestamp"] = 0;
                expect(manager["shouldSwitchRpc"]()).toBe(true);
            });

            it("should return false if the health check is not performed", async () => {
                manager["lastSwitchTimestamp"] = Date.now();
                expect(manager["shouldSwitchRpc"]()).toBe(false);
            });
        });

        describe("handleRateLimitError", () => {
            it("should switch to the next RPC URL if the rate limit error is received", async () => {
                jest.spyOn(manager as any, "switchToNextRPC");
                await manager["handleRateLimitError"](1);
                expect(manager["switchToNextRPC"]).toHaveBeenCalled();
            });
        });
    });
});
