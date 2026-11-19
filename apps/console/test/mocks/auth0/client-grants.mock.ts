import { createMock, MethodMock } from "@shared/test";
import { ManagementClient } from "auth0";

export const ClientGrantsMock = createMock<Pick<ManagementClient["clientGrants"], "getAll" | "create">>({
    getAll: new MethodMock("mockResolvedValue"),
    create: new MethodMock("mockResolvedValue"),
});
