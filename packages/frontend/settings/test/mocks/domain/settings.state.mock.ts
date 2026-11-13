import { State } from "@frontend/core/domain/state";
import { createMock, MethodMock } from "@shared/test";
import { SettingsMock } from "../common/settings.mock";
import { ISettingsState } from "../../../src/ui/state";

export const SettingsStateMock = createMock<State<ISettingsState>>({
    setState: new MethodMock("mockReturnValue"),
    getState: new MethodMock("mockReturnValue", new SettingsMock()),
    subscribe: new MethodMock("mockReturnValue"),
    reset: new MethodMock("mockReturnValue"),
});
