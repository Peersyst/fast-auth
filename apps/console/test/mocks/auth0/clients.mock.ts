import { createMock, MethodMock } from "@shared/test";
import { ManagementClient } from "auth0";

export const ClientsMock = createMock<Pick<ManagementClient["clients"], "get" | "create" | "getEnabledConnections">>({
    get: new MethodMock("mockResolvedValue"),
    create: new MethodMock("mockResolvedValue"),
    getEnabledConnections: new MethodMock("mockResolvedValue"),
});
