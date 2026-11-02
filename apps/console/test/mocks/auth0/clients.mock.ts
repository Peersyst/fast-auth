import { createMock, MethodMock } from "@shared/test";
import type { ManagementClient } from "auth0";

export const ClientsMock = createMock<
    Pick<ManagementClient["clients"], "get" | "getAll" | "create" | "update" | "delete" | "getEnabledConnections">
>({
    get: new MethodMock("mockResolvedValue"),
    getAll: new MethodMock("mockResolvedValue"),
    create: new MethodMock("mockResolvedValue"),
    update: new MethodMock("mockResolvedValue"),
    delete: new MethodMock("mockResolvedValue"),
    getEnabledConnections: new MethodMock("mockResolvedValue"),
});
