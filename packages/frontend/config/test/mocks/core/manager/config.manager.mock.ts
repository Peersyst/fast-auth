import { getAttribute } from "@shared/utils";
import { NestedKeys, DeepPick } from "@swisstype/essential";
import { Config, config, IConfigManager } from "../../../../src";
import { createMock, MethodMock } from "@shared/test";

export const ConfigManagerMock = createMock<IConfigManager>({
    config,
    initialization: Promise.resolve(),
    isLoaded: true,
    isOutdated: false,
    on: new MethodMock("mockReturnValue", jest.fn()),
    once: new MethodMock("mockReturnValue", jest.fn()),
    load: new MethodMock("mockResolvedValue"),
    reload: new MethodMock("mockResolvedValue"),
    getAll: new MethodMock("mockReturnValue", config),
    getAllAsync: new MethodMock("mockResolvedValue", config),
    get: new MethodMock(
        "mockImplementation",
        jest.fn(<K extends NestedKeys<Config>>(key: K): DeepPick<Config, K> => getAttribute(config, key) as DeepPick<Config, K>),
    ),
    getAsync: new MethodMock(
        "mockImplementation",
        jest.fn(
            <K extends NestedKeys<Config>>(key: K): Promise<DeepPick<Config, K>> =>
                Promise.resolve(getAttribute(config, key) as DeepPick<Config, K>),
        ),
    ),
});
