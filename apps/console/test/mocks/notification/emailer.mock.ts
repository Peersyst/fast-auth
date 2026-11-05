import { createMock, MethodMock } from "@shared/test";
import { IEmailerService } from "../../../src/modules/notification/interfaces/i-emailer.service";

export const EmailerMock = createMock<IEmailerService>({
    send: new MethodMock("mockResolvedValue", undefined),
});
