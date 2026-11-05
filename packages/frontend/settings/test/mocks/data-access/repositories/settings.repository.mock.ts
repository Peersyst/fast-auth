import { createMock, MethodMock } from "@shared/test";
import { SettingsRepository } from "../../../../src/data-access/repositories/settings.repository";
import { SettingsMock } from "../../common/settings.mock";

const settingsMock = new SettingsMock();

export const SettingsRepositoryMock = createMock<SettingsRepository>({
    getSettings: new MethodMock("mockResolvedValue", settingsMock),
    setSettings: new MethodMock("mockResolvedValue"),
    getLocale: new MethodMock("mockResolvedValue", settingsMock.locale),
    setLocale: new MethodMock("mockResolvedValue"),
    getTheme: new MethodMock("mockResolvedValue", settingsMock.theme),
    setTheme: new MethodMock("mockResolvedValue"),
});
