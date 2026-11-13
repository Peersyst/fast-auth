import { createMock, MethodMock } from "@shared/test";
import { ISlackNotifierService } from "../../../src/modules/notification/interfaces/i-slack-notifier.service";

export const SlackNotifierMock = createMock<ISlackNotifierService>({
    notify: new MethodMock("mockResolvedValue", undefined),
});
