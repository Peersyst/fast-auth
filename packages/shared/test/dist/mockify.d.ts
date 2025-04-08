import { DeepPartial } from "@swisstype/essential";
export type { DeepPartial } from "@swisstype/essential";
export declare function mockify<T extends object>(defaultValues?: DeepPartial<T>): {
    new (data?: DeepPartial<T>): T;
};
