import { createMock, MethodMock } from "@shared/test";
import type { DappsMetrics } from "../../../src/modules/dapps/dapps.metrics";

export const DappsMetricsMock = createMock<Pick<DappsMetrics, "countEmail">>({
    countEmail: new MethodMock("mockReturnValue"),
});
