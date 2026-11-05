import { OpenAPI } from "@shared/console";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { ConsoleAuthController } from "@frontend/console-auth/domain/controllers";
import { configManager } from "../../config";

OpenAPI.TOKEN = () => getInstance(ConsoleAuthController).getIdToken();

// Set dynamic OpenAPI config attributes
configManager.on("load", (config) => {
    OpenAPI.BASE = config.backendUrl;
});
