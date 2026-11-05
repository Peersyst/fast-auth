import { closeTestApp, createTestApp, TestApp } from "@backend/test";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmHealthIndicator } from "@nestjs/terminus";
import { TypeOrmModule } from "@nestjs/typeorm";
import { HealthModule } from "../../../src/modules/health/health.module";
import { HealthService } from "../../../src/modules/health/health.service";
import { testConfig } from "../../mocks/config/config.mock";
import { BUSINESS_EXCEPTION_FILTER } from "../../../src/modules/common/exception/business-exception.filter";

describe("HealthModule (integration)", () => {
    let testApp: TestApp;

    beforeAll(async () => {
        testApp = await createTestApp({
            providers: [BUSINESS_EXCEPTION_FILTER],
            imports: [
                ConfigModule.forRoot({ load: [testConfig], isGlobal: true }),
                TypeOrmModule.forRoot(testConfig().database),
                HealthModule,
            ],
        });
    });

    afterAll(async () => {
        await closeTestApp(testApp.app);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    describe("GET /livez", () => {
        it("should answer 200 ok", async () => {
            const { body } = await testApp.request.get("/livez").expect(200);

            expect(body).toEqual({ status: "ok" });
        });
    });

    describe("GET /readyz", () => {
        it("should answer 200 ok when the database answers", async () => {
            const { body } = await testApp.request.get("/readyz").expect(200);

            expect(body).toEqual({ status: "ok", checks: { shutdown: { status: "ok" }, database: { status: "ok" } } });
        });

        it("should answer 503 with the database check in error when it is down", async () => {
            jest.spyOn(TypeOrmHealthIndicator.prototype, "pingCheck").mockResolvedValueOnce({
                database: { status: "down", message: "timeout of 2000ms exceeded" },
            });

            const { body } = await testApp.request.get("/readyz").expect(503);

            expect(body).toEqual({
                status: "error",
                checks: { shutdown: { status: "ok" }, database: { status: "error", message: "timeout of 2000ms exceeded" } },
            });
        });

        it("should answer 503 with the database check in error when the ping throws", async () => {
            jest.spyOn(TypeOrmHealthIndicator.prototype, "pingCheck").mockRejectedValueOnce(new Error("Connection refused"));

            const { body } = await testApp.request.get("/readyz").expect(503);

            expect(body).toEqual({
                status: "error",
                checks: { shutdown: { status: "ok" }, database: { status: "error", message: "Connection refused" } },
            });
        });

        it("should answer 503 with the shutdown check in error once the app starts shutting down", async () => {
            await testApp.module.get(HealthService).beforeApplicationShutdown();

            const { body } = await testApp.request.get("/readyz").expect(503);

            expect(body).toEqual({
                status: "error",
                checks: { shutdown: { status: "error", message: "Shutting down" }, database: { status: "ok" } },
            });
            await testApp.request.get("/livez").expect(200);
        });
    });
});
