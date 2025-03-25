import { DeepPartial } from "@swisstype/essential";
import deepmerge from "./utils/deepmerge";

// Has to be reexported to favor portability
export type { DeepPartial } from "@swisstype/essential";

/**
 * Creates a mock class for an object.
 * @param defaultValues The default values to use for the mock.
 * @returns The mock class.
 */
export function mockify<T extends object>(defaultValues: DeepPartial<T> = {}): { new (data?: DeepPartial<T>): T } {
    return class {
        constructor(data: DeepPartial<T> = {}) {
            Object.assign(this, deepmerge(defaultValues, data));
        }
    } as { new (data?: DeepPartial<T>): T };
}
