import { createMock, MethodMock } from "@shared/test";
import { IConsoleDappApi } from "../../../../src/domain/interfaces";
import { OwnerDappMock } from "@shared/console/test/mocks/dapp";

export const ConsoleDappApiMock = createMock<IConsoleDappApi>({
    getMine: new MethodMock("mockResolvedValue", { dapp: new OwnerDappMock() }),
    submit: new MethodMock("mockResolvedValue", new OwnerDappMock()),
    edit: new MethodMock("mockResolvedValue", new OwnerDappMock({ version: 4 })),
    remove: new MethodMock("mockResolvedValue"),
});
