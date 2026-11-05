import { HttpStatus } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { QueryFailedError, Repository } from "typeorm";
import { Setting } from "@database/console/entities";
import { BusinessException } from "../../../src/modules/common/exception/business.exception";
import { SettingService } from "../../../src/modules/setting/setting.service";

describe("SettingService", () => {
    /**
     * Builds the service over a repository whose transactions fail with the given Postgres error code.
     * @param code The Postgres error code.
     * @returns The service.
     */
    const serviceFailingWith = (code: string): SettingService => {
        const failure = new QueryFailedError("SELECT", [], Object.assign(new Error("postgres"), { code }));
        const repository = { manager: { transaction: () => Promise.reject(failure) } } as unknown as Repository<Setting>;
        return new SettingService(repository, {} as ConfigService);
    };

    describe("update", () => {
        it("should answer 409 SETTINGS_CHANGED when the settings row stays locked past the lock timeout", async () => {
            const error = await serviceFailingWith("55P03")
                .update({ autoApproval: { enabled: true } }, "admin@console.test")
                .catch((e: unknown) => e);

            expect(error).toBeInstanceOf(BusinessException);
            expect((error as BusinessException).getStatus()).toBe(HttpStatus.CONFLICT);
            expect((error as BusinessException).getResponse()).toEqual({ statusCode: 409, message: "SETTINGS_CHANGED" });
        });

        it("should rethrow any other database error as it is", async () => {
            const error = await serviceFailingWith("57P01")
                .update({ autoApproval: { enabled: true } }, "admin@console.test")
                .catch((e: unknown) => e);

            expect(error).toBeInstanceOf(QueryFailedError);
        });
    });
});
