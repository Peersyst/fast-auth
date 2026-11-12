import { createMock, MethodMock } from "@shared/test";
import { IStorage } from "../../../../src/data-access/repository";

export const StorageMock = createMock<IStorage>({
    setItem: new MethodMock("mockReturnValue"),
    getItem: new MethodMock("mockReturnValue"),
    removeItem: new MethodMock("mockReturnValue"),
});
