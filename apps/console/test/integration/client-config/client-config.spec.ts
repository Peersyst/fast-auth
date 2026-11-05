import { closeTestApp, createTestApp, TestApp } from "@backend/test";
import { ConfigModule } from "@nestjs/config";
import { ClientConfigModule } from "../../../src/modules/client-config/client-config.module";
import { testConfig } from "../../mocks/config/config.mock";
import { BUSINESS_EXCEPTION_FILTER } from "../../../src/modules/common/exception/business-exception.filter";

describe("ClientConfigModule (integration)", () => {
    let testApp: TestApp;

    beforeAll(async () => {
        testApp = await createTestApp({
            providers: [BUSINESS_EXCEPTION_FILTER],
            imports: [ConfigModule.forRoot({ load: [testConfig], isGlobal: true }), ClientConfigModule],
        });
    });

    afterAll(async () => {
        await closeTestApp(testApp.app);
    });

    describe("GET /config", () => {
        it("should answer the Auth0 login settings without a token and without the provisioner settings", async () => {
            const { body } = await testApp.request.get("/config").expect(200);

            expect(body).toEqual({ auth0Domain: "login.console.test", auth0ClientId: "test-console-client-id", nearNetwork: "testnet" });
        });
    });

    describe("unknown routes", () => {
        it("should answer 404 NOT_FOUND", async () => {
            const { body } = await testApp.request.get("/nowhere").expect(404);

            expect(body).toEqual({ statusCode: 404, message: "NOT_FOUND" });
        });
    });
});
