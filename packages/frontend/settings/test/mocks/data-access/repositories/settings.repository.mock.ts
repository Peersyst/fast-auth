import { createMock, MethodMock } from "@shared/test";
import { SettingsRepository } from "../../../../src/data-access/repositories/settings.repository";
import { SettingsMock } from "../../common/settings.mock";

const settingsMock = new SettingsMock();

export const SettingsRepositoryMock = createMock<SettingsRepository>({
    getSettings: new MethodMock("mockResolvedValue", settingsMock),
    setTheme: new MethodMock("mockResolvedValue"),
});
