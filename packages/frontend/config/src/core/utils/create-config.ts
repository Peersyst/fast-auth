import { Config, CoreConfig } from "../types";
import { config as coreConfig } from "../config";
import { LoosenDeeply } from "@swisstype/essential";
import { deepmerge } from "@shared/utils";

/**
 * Creates a config.
 * @param config The config.
 * @returns The created config.
 */
export function createConfig(config: LoosenDeeply<Config, keyof CoreConfig>): Config {
    return deepmerge(coreConfig, config);
}
