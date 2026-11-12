import { createState } from "@frontend/core/domain/state";
import { ISettingsState } from "../ui/state";

export const defaultSettingsState: ISettingsState = {
    theme: "system",
};

export const settingsState = createState<ISettingsState>("settings-state", () => defaultSettingsState);
