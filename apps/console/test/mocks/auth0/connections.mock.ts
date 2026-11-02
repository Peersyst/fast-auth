import { createMock, MethodMock } from "@shared/test";
import type { ManagementClient } from "auth0";

export const ConnectionsMock = createMock<Pick<ManagementClient["connections"], "updateEnabledClients">>({
    updateEnabledClients: new MethodMock("mockResolvedValue"),
});
