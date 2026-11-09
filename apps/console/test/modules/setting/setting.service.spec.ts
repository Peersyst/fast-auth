import { ConfigService } from "@nestjs/config";
import { SettingService } from "../../../src/modules/setting/setting.service";

describe("SettingService", () => {
    /**
     * Builds the service with the given initial switch.
     * @param enabled The configured initial value.
     * @returns The service.
     */
    const serviceStarting = (enabled: boolean): SettingService =>
        new SettingService(new ConfigService({ admin: { autoApprovalEnabled: enabled } }));

    it("should start from the configured value", () => {
        expect(serviceStarting(true).get()).toEqual({ autoApproval: { enabled: true } });
        expect(serviceStarting(false).isAutoApprovalEnabled()).toBe(false);
    });

    it("should keep the value an admin sets", () => {
        const service = serviceStarting(false);

        expect(service.update({ autoApproval: { enabled: true } })).toEqual({ autoApproval: { enabled: true } });
        expect(service.isAutoApprovalEnabled()).toBe(true);
    });
});
