import { createMock, MethodMock } from "@shared/test";
import { ILocalizationService } from "../../../../src/domain/interfaces";

export const LocalizationServiceMock = createMock<ILocalizationService>({
    getLocale: new MethodMock("mockResolvedValue", "en"),
});
