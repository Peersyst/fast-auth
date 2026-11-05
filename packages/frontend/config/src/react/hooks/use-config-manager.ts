import { IConfigManager } from "../../core/interfaces";
import { useConfigManagerContext } from "./use-config-manager-context";

/**
 * Hook that provides the ConfigManager.
 * @returns The ConfigManager.
 */
export function useConfigManager(): IConfigManager {
    const configManager = useConfigManagerContext();

    if (!configManager) {
        throw new Error("ConfigManager is not defined. Make sure you provided a ConfigManager in a ConfigManagerProvider.");
    }

    return configManager;
}
