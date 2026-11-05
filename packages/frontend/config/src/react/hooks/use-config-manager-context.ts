import { useContext } from "react";
import { ConfigManagerContext } from "../context";
import { IConfigManager } from "../../core/interfaces";

/**
 * Hook that provides the ConfigManagerContext.
 * @returns The ConfigManagerContext.
 */
export function useConfigManagerContext(): IConfigManager | undefined {
    return useContext(ConfigManagerContext);
}
