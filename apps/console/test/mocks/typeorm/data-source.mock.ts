import { createMock, MethodMock } from "@shared/test";
import type { DataSource } from "typeorm";

export const DataSourceMock = createMock<Pick<DataSource, "query">>({
    query: new MethodMock("mockResolvedValue", []),
});
