import { createMock, MethodMock } from "@shared/test";
import { IConsoleAdminApi, IConsoleSettingApi } from "../../../../src/domain/interfaces";
import { AdminDappMock } from "@shared/console/test/mocks/admin";

export const ConsoleAdminApiMock = createMock<IConsoleAdminApi>({
    list: new MethodMock("mockResolvedValue", { items: [new AdminDappMock()], totalItems: 1, currentPage: 1, pages: 1 }),
    get: new MethodMock("mockResolvedValue", new AdminDappMock()),
    edit: new MethodMock("mockResolvedValue", new AdminDappMock({ version: 4 })),
    approve: new MethodMock("mockResolvedValue", new AdminDappMock({ status: "approved", version: 4 })),
    reject: new MethodMock("mockResolvedValue", new AdminDappMock({ status: "rejected", version: 4 })),
    approveChange: new MethodMock("mockResolvedValue", new AdminDappMock({ status: "approved", version: 4 })),
    rejectChange: new MethodMock("mockResolvedValue", new AdminDappMock({ status: "approved", version: 4 })),
    remove: new MethodMock("mockResolvedValue", new AdminDappMock({ status: "removed", version: 4 })),
    listEvents: new MethodMock("mockResolvedValue", []),
});

export const ConsoleSettingApiMock = createMock<IConsoleSettingApi>({
    get: new MethodMock("mockResolvedValue", { autoApproval: { enabled: false } }),
    update: new MethodMock("mockResolvedValue", { autoApproval: { enabled: true } }),
});
