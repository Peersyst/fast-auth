import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { OpenAPIObject } from "@nestjs/swagger";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { NextFunction, Request, Response } from "express";
import * as OpenApiValidator from "express-openapi-validator";
import helmet from "helmet";
import { utilities as nestWinstonUtilities, WinstonModule } from "nest-winston";
import { existsSync } from "node:fs";
import { extname, join } from "node:path";
import * as winston from "winston";
import type { ConsoleConfig } from "./config/console-config";
import { ConfigEnv } from "./config/console-config";
import { ConsoleExceptionFilter } from "./modules/common/exception/console-exception.filter";
import { validationExceptionFactory } from "./modules/common/exception/validation-exception.factory";
import { requestLogger } from "./modules/common/middleware/request-logger";

export const API_PREFIX = "api/console";
const API_PATH = `/${API_PREFIX}`;
const OPENAPI_SPEC_PATH = join(__dirname, "..", "openapi-spec.json");
const PUBLIC_DIR = join(__dirname, "public");

export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
    return SwaggerModule.createDocument(app, new DocumentBuilder().setTitle("NEAR Auth Console").addBearerAuth().build());
}

function serveSpa(app: NestExpressApplication, env: ConfigEnv, publicDir: string): void {
    if (!existsSync(publicDir)) {
        if (env === ConfigEnv.Development || env === ConfigEnv.Test) return;
        throw new Error(`The SPA build is missing: ${publicDir} does not exist`);
    }
    const indexHtml = join(publicDir, "index.html");
    app.useStaticAssets(join(publicDir, "assets"), { prefix: "/assets", immutable: true, maxAge: "1y" });
    app.useStaticAssets(publicDir);
    app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.method !== "GET" || req.path === API_PATH || req.path.startsWith(`${API_PATH}/`) || extname(req.path)) return next();
        res.sendFile(indexHtml);
    });
}

export function configureApp(app: NestExpressApplication, config: ConsoleConfig, publicDir: string = PUBLIC_DIR): void {
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
    serveSpa(app, env, publicDir);

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
