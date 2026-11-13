import { createMock, MethodMock } from "@shared/test";
import { IConsoleAdminApi } from "../../../../src/domain/interfaces";
import { DappMock } from "@shared/console/test/mocks/dapp";

export const ConsoleAdminApiMock = createMock<IConsoleAdminApi>({
    list: new MethodMock("mockResolvedValue", { items: [new DappMock()], totalItems: 1, currentPage: 1, pages: 1 }),
    get: new MethodMock("mockResolvedValue", new DappMock()),
    approve: new MethodMock("mockResolvedValue", new DappMock({ status: "approved" })),
    reject: new MethodMock("mockResolvedValue", new DappMock({ status: "rejected" })),
    approveChange: new MethodMock("mockResolvedValue", new DappMock({ status: "approved" })),
    rejectChange: new MethodMock("mockResolvedValue", new DappMock({ status: "approved" })),
});
