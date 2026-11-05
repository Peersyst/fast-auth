import { ConfigService } from "@nestjs/config";
import { createMock, MethodMock } from "@shared/test";

export const ConfigServiceMock = createMock<ConfigService>({
    changes$: {} as any,
    get: new MethodMock("mockReturnValue", "value"),
    getOrThrow: new MethodMock("mockReturnValue", "value"),
    set: new MethodMock("mockReturnValue", "value"),
    setEnvFilePaths: new MethodMock("mockReturnValue", "value"),
});
