import { createMock, MethodMock } from "@shared/test";
import type { Emailer } from "../../../src/modules/notifications/emailer";

export const EmailerMock = createMock<Emailer>({
    send: new MethodMock("mockResolvedValue"),
});
