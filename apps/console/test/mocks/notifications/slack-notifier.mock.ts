import { createMock, MethodMock } from "@shared/test";
import type { SlackNotifier } from "../../../src/modules/notifications/slack-notifier";

export const SlackNotifierMock = createMock<SlackNotifier>({
    notify: new MethodMock("mockResolvedValue"),
});
