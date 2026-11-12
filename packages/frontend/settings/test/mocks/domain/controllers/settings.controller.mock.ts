import { createMock, MethodMock } from "@shared/test";
import { SettingsController } from "../../../../src/domain/controllers/settings";
import { SettingsMock } from "../../common/settings.mock";
import { SettingsStateMock } from "../settings.state.mock";

const settingsMock = new SettingsMock();

export const SettingsControllerMock = createMock<SettingsController>({
    onInit: new MethodMock("mockResolvedValue"),
    settingsState: new SettingsStateMock(),
    getSettings: new MethodMock("mockResolvedValue", settingsMock),
    setSettings: new MethodMock("mockResolvedValue"),
    getLocale: new MethodMock("mockResolvedValue", settingsMock.locale),
    setLocale: new MethodMock("mockResolvedValue"),
    getTheme: new MethodMock("mockResolvedValue", settingsMock.theme),
    setTheme: new MethodMock("mockResolvedValue"),
});
