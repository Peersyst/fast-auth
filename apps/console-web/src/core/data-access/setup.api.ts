import { OpenAPI } from "@shared/console";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { ConsoleAuthController } from "@frontend/console-auth/domain/controllers";
import { config } from "../../config";

OpenAPI.BASE = config.backendUrl;
OpenAPI.TOKEN = () => getInstance(ConsoleAuthController).getIdToken();
