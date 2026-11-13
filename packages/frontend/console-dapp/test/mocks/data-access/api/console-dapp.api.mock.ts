import { createMock, MethodMock } from "@shared/test";
import { IConsoleDappApi } from "../../../../src/domain/interfaces";
import { DappMock } from "@shared/console/test/mocks/dapp";

export const ConsoleDappApiMock = createMock<IConsoleDappApi>({
    list: new MethodMock("mockResolvedValue", { items: [new DappMock()], totalItems: 1, currentPage: 1, pages: 1 }),
    create: new MethodMock("mockResolvedValue", new DappMock()),
    update: new MethodMock("mockResolvedValue", new DappMock({ description: "The wallet." })),
});
