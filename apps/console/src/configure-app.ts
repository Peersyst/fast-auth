import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { OpenAPIObject } from "@nestjs/swagger";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as OpenApiValidator from "express-openapi-validator";
import helmet from "helmet";
import { utilities as nestWinstonUtilities, WinstonModule } from "nest-winston";
import { join } from "node:path";
import * as winston from "winston";
import type { ConsoleConfig } from "./config/console-config";
import { ConfigEnv } from "./config/console-config";
import { ConsoleExceptionFilter } from "./modules/common/exception/console-exception.filter";
import { validationExceptionFactory } from "./modules/common/exception/validation-exception.factory";
import { requestLogger } from "./modules/common/middleware/request-logger";

export const API_PREFIX = "api/console";
const API_PATH = `/${API_PREFIX}`;
const OPENAPI_SPEC_PATH = join(__dirname, "..", "openapi-spec.json");

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
    return SwaggerModule.createDocument(app, new DocumentBuilder().setTitle("NEAR Auth Console").addBearerAuth().build());
}

export function configureApp(app: NestExpressApplication, config: ConsoleConfig): void {
    const { env } = config.server;
    app.useLogger(
        WinstonModule.createLogger({
            level: env === ConfigEnv.Test ? "warn" : "info",
            transports: [
                new winston.transports.Console({
                    format: winston.format.combine(winston.format.timestamp(), nestWinstonUtilities.format.nestLike("console")),
                }),
            ],
        }),
    );
    app.use(requestLogger);

    const loginOrigin = `https://${config.auth0.loginDomain}`;
    app.use(
        helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    scriptSrc: ["'self'"],
                    connectSrc: ["'self'", loginOrigin],
                    frameSrc: [loginOrigin],
                    workerSrc: ["'self'", "blob:"],
                    imgSrc: ["'self'", "data:", "https:"],
                },
            },
            crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" },
            // helmet 6 sends require-corp by default, which blocks the Auth0 iframe and hot-linked logos.
            crossOriginEmbedderPolicy: false,
        }),
    );

    app.setGlobalPrefix(API_PREFIX);
    if (env === ConfigEnv.Development || env === ConfigEnv.Test) {
        SwaggerModule.setup(`${API_PREFIX}/docs`, app, createOpenApiDocument(app));
    }
    // The validator reads req.body, so JSON parsing must come first.
    app.useBodyParser("json");
    app.use(API_PATH, ...OpenApiValidator.middleware({ apiSpec: OPENAPI_SPEC_PATH, validateRequests: true, validateResponses: false }));
    app.useGlobalPipes(
        new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true, exceptionFactory: validationExceptionFactory }),
    );
    app.useGlobalFilters(new ConsoleExceptionFilter());
}
