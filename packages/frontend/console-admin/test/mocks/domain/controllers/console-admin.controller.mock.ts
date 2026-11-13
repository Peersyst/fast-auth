import { createMock, MethodMock } from "@shared/test";
import { IConsoleAdminController } from "../../../../src/ui/interfaces";
import { DappMock } from "@shared/console/test/mocks/dapp";

export const ConsoleAdminControllerMock = createMock<IConsoleAdminController>({
    listDapps: new MethodMock("mockResolvedValue", { items: [new DappMock()], totalItems: 1, currentPage: 1, pages: 1 }),
    getDapp: new MethodMock("mockResolvedValue", new DappMock()),
    approveDapp: new MethodMock("mockResolvedValue", new DappMock({ status: "approved" })),
    rejectDapp: new MethodMock("mockResolvedValue", new DappMock({ status: "rejected" })),
    approveChange: new MethodMock("mockResolvedValue", new DappMock({ status: "approved" })),
    rejectChange: new MethodMock("mockResolvedValue", new DappMock({ status: "approved" })),
});
