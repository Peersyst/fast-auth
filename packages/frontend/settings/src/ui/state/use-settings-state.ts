import { useStore } from "zustand";
import { settingsState } from "../../domain/settings.state";
import { Settings } from "../../common";

export type ISettingsState = Settings;

/**
 * Gets the settings state.
 * @returns The settings state.
 */
export const useSettingsState = (): ISettingsState => useStore(settingsState);
