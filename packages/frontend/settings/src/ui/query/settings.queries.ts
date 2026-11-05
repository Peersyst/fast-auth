import { Settings } from "../../common";

const SETTINGS_ROOT_QUERY_KEY = "settings";

export const settingsQueryKeys = {
    all: [SETTINGS_ROOT_QUERY_KEY] as const,
    lists: () => [...settingsQueryKeys.all, "list"] as const,
    details: () => [...settingsQueryKeys.all, "detail"] as const,
    detail: (key: keyof Settings) => [...settingsQueryKeys.details(), key] as const,
};

export type SettingsQueryKeys = typeof settingsQueryKeys;
