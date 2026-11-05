import { createMock, MethodMock } from "@shared/test";
import { IConsoleAdminController } from "../../../../src/ui/interfaces";
import { AdminDappMock } from "@shared/console/test/mocks/admin";

export const ConsoleAdminControllerMock = createMock<IConsoleAdminController>({
    listDapps: new MethodMock("mockResolvedValue", { items: [new AdminDappMock()], totalItems: 1, currentPage: 1, pages: 1 }),
    getDapp: new MethodMock("mockResolvedValue", new AdminDappMock()),
    getDappEvents: new MethodMock("mockResolvedValue", []),
    editDapp: new MethodMock("mockResolvedValue", new AdminDappMock({ version: 4 })),
    approveDapp: new MethodMock("mockResolvedValue", new AdminDappMock({ status: "approved", version: 4 })),
    rejectDapp: new MethodMock("mockResolvedValue", new AdminDappMock({ status: "rejected", version: 4 })),
    approveChange: new MethodMock("mockResolvedValue", new AdminDappMock({ status: "approved", version: 4 })),
    rejectChange: new MethodMock("mockResolvedValue", new AdminDappMock({ status: "approved", version: 4 })),
    changeOwner: new MethodMock("mockResolvedValue", new AdminDappMock({ ownerEmail: "new@acme.xyz", version: 4 })),
    removeDapp: new MethodMock("mockResolvedValue", new AdminDappMock({ status: "removed", version: 4 })),
    getSettings: new MethodMock("mockResolvedValue", { autoApproval: { enabled: false, dailyCap: 10 } }),
    setAutoApproval: new MethodMock("mockResolvedValue", { autoApproval: { enabled: true, dailyCap: 10 } }),
});
