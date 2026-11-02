import { createMock, MethodMock } from "@shared/test";
import type { DappEventsRepository } from "../../../src/modules/dapps/repositories/dapp-events.repository";

export const DappEventsRepositoryMock = createMock<Pick<DappEventsRepository, "append">>({
    append: new MethodMock("mockResolvedValue"),
});
