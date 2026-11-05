import { getInstance } from "@frontend/core/common/utils/singleton";
import { ConsoleAuthController } from "@frontend/console-auth/domain/controllers";
import { ApiFactory } from "../../../../../src/core/data-access/factories/api.factory";
import { apiError, mockApi } from "../../../../utils";

const ME = { email: "owner@example.com", role: "user", emailVerified: true };

describe("ApiFactory", () => {
    describe("consoleAuthApi", () => {
        it("should renew the session once after a 401 and send the request again with the renewed token", async () => {
            const auth = getInstance(ConsoleAuthController);
            jest.spyOn(auth, "getIdToken").mockResolvedValueOnce("expired-token").mockResolvedValueOnce("renewed-token");
            const refreshSession = jest.spyOn(auth, "refreshSession").mockResolvedValue();
            let calls = 0;
            const api = mockApi({ "GET /api/console/me": () => (calls++ === 0 ? apiError(401, "UNAUTHENTICATED") : { body: ME }) });

            await expect(ApiFactory.consoleAuthApi.me()).resolves.toEqual(ME);

            expect(refreshSession).toHaveBeenCalledTimes(1);
            expect(api.sent("GET /api/console/me").map((request) => request.authorization)).toEqual([
                "Bearer expired-token",
                "Bearer renewed-token",
            ]);
        });

        it("should give up after the retry is refused too", async () => {
            const auth = getInstance(ConsoleAuthController);
            jest.spyOn(auth, "getIdToken").mockResolvedValue("id-token");
            const refreshSession = jest.spyOn(auth, "refreshSession").mockResolvedValue();
            const api = mockApi({ "GET /api/console/me": apiError(401, "UNAUTHENTICATED") });

            await expect(ApiFactory.consoleAuthApi.me()).rejects.toMatchObject({ status: 401 });

            expect(refreshSession).toHaveBeenCalledTimes(1);
            expect(api.sent("GET /api/console/me")).toHaveLength(2);
        });
    });
});
