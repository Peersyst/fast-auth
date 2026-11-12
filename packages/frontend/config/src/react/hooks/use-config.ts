import { DeepPick, NestedKeys } from "@swisstype/essential";
import { useCallback, useSyncExternalStore } from "react";
import { useConfigManager } from "./use-config-manager";
import { RefsCache } from "../../core/cache";
import { Config } from "../../core/types";

/**
 * Cache used to maintain references.
 * If references are not maintained, they'll change when config is loaded even if the "slice" value stays the same.
 * This would cause unnecessary re-renders.
 * @example
 * Without maintaining refs:
 * ```ts
 * const aConfigObject = useConfig("a"); // Where a = { b: 1, c: 2 }
 * // A new config is loaded but `a` stays the same -> Rerender :(
 * // A new config is loaded but `a` changes -> Rerender :)
 * ```
 *
 * Maintaining refs:
 * ```ts
 * const aConfigObject = useConfig("a"); // Where a = { b: 1, c: 2 }
 * // A new config is loaded but `a` stays the same -> No rerender :)
 * // A new config is loaded but `a` changes -> Rerender :)
 * ```
 */
const refsCache = new RefsCache();

/**
 * Hook used to get config values.
 * If no keys are provided, the whole config is returned.
 * If one key is provided, the value of that key is returned.
 * If multiple keys are provided, an object containing the values of those keys is returned.
 * @param keys The keys to get values for. (Can be undefined, one key or multiple keys)
 * @returns The config value(s).
 */
export function useConfig<Keys extends NestedKeys<Config>[] = []>(
    ...keys: Keys
): Keys["length"] extends 0
    ? Config
    : Keys["length"] extends 1
      ? DeepPick<Config, Keys[0]>
      : { [key in Exclude<Keys[number], undefined>]: DeepPick<Config, key> } {
    const configManager = useConfigManager();

    /**
     * Function used to subscribe to config manager events.
     * @returns The unsubscribe function.
     */
    const subscribeToConfigManager = useCallback(
        function subscribeToConfigManager(listener: () => void): () => void {
            return configManager.on("load", listener);
        },
        [configManager],
    );

    const value = useSyncExternalStore(subscribeToConfigManager, () => {
        if (keys.length === 0) {
            return configManager.getAll();
        } else if (keys.length === 1) {
            return refsCache.get(configManager.get(keys[0]));
        } else {
            return refsCache.get(
                keys.reduce(
                    (acc, key) => ({ ...acc, [key as string]: configManager.get(key) }),
                    {} as { [key in Exclude<Keys[number], undefined>]: DeepPick<Config, key> },
                ),
            );
        }
    });

    return value as any; // ts doesn't seem to like this complex type (it is safe though)
}
