import type { INestApplication } from "@nestjs/common";
import { ValidationPipe } from "@nestjs/common";
import type { NestExpressApplication } from "@nestjs/platform-express";
import type { OpenAPIObject } from "@nestjs/swagger";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { NextFunction, Request, Response } from "express";
import * as OpenApiValidator from "express-openapi-validator";
import helmet from "helmet";
import { utilities as nestWinstonUtilities, WinstonModule } from "nest-winston";
import { existsSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import * as winston from "winston";
import type { ConsoleConfig } from "./config/console-config";
import { ConfigEnv } from "./config/console-config";
import { ConsoleExceptionFilter } from "./modules/common/exception/console-exception.filter";
import { validationExceptionFactory } from "./modules/common/exception/validation-exception.factory";
import { requestLogger } from "./modules/common/middleware/request-logger";

export const API_PREFIX = "api/console";
const API_PATH = `/${API_PREFIX}`;
export const OPENAPI_SPEC_PATH = join(__dirname, "..", "openapi-spec.json");
const PACKAGE_JSON_PATH = join(__dirname, "..", "package.json");
const PUBLIC_DIR = join(__dirname, "public");

/**
 * Builds the OpenAPI document, with its description and version taken from package.json.
 * @param app The app whose routes the document describes.
 * @returns The OpenAPI document.
 */
export function createOpenApiDocument(app: INestApplication): OpenAPIObject {
    const { description, version } = JSON.parse(readFileSync(PACKAGE_JSON_PATH, "utf8")) as { description: string; version: string };
    return SwaggerModule.createDocument(
        app,
        new DocumentBuilder().setTitle("NEAR Auth Console").setDescription(description).setVersion(version).addBearerAuth().build(),
    );
}

/**
 * Serves the SPA build, falling back to index.html for GET routes outside the API that name no file.
 * @param app The app to serve it from.
 * @param env The environment, which decides whether a missing build is fatal.
 * @param publicDir The directory holding the SPA build.
 */
function serveSpa(app: NestExpressApplication, env: ConfigEnv, publicDir: string): void {
    if (!existsSync(publicDir)) {
        if (env === ConfigEnv.DEVELOPMENT || env === ConfigEnv.TEST) return;
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

/**
 * Builds the log line format, which is JSON in production and Nest's readable layout elsewhere.
 * @param env The environment the app runs in.
 * @param colors Whether the readable layout colours its output.
 * @returns The winston format.
 */
export function createLogFormat(env: ConfigEnv, colors: boolean): winston.Logform.Format {
    return winston.format.combine(
        winston.format.timestamp(),
        env === ConfigEnv.PRODUCTION ? winston.format.json() : nestWinstonUtilities.format.nestLike("console", { colors }),
    );
}

/**
 * Applies the logger, security headers, prefix, docs, request validation and error filter that main.ts and the tests share.
 * @param app The app to configure.
 * @param config The validated config.
 * @param publicDir The directory holding the SPA build.
 */
export function configureApp(app: NestExpressApplication, config: ConsoleConfig, publicDir: string = PUBLIC_DIR): void {
    const { env } = config.server;
    const { level, file } = config.logger;
    app.useLogger(
        WinstonModule.createLogger({
            level,
            transports: [
                new winston.transports.Console({ format: createLogFormat(env, true) }),
                ...(file === null ? [] : [new winston.transports.File({ format: createLogFormat(env, false), filename: file })]),
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
        }),
    );
    serveSpa(app, env, publicDir);

    app.setGlobalPrefix(API_PREFIX);
    if (env === ConfigEnv.DEVELOPMENT || env === ConfigEnv.TEST) {
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
