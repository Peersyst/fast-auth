import { createMock, MethodMock } from "@shared/test";
import { IConsoleDappController } from "../../../../src/ui/interfaces";
import { OwnerDappMock } from "@shared/console/test/mocks/dapp";

export const ConsoleDappControllerMock = createMock<IConsoleDappController>({
    getMyDapp: new MethodMock("mockResolvedValue", new OwnerDappMock()),
    submitDapp: new MethodMock("mockResolvedValue", new OwnerDappMock()),
    editDapp: new MethodMock("mockResolvedValue", new OwnerDappMock({ version: 4 })),
    withdrawChange: new MethodMock("mockResolvedValue", new OwnerDappMock({ version: 4 })),
    removeDapp: new MethodMock("mockResolvedValue"),
});
