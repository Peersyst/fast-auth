import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import * as fs from "fs";
import helmet from "helmet";
import morgan from "morgan";
import { utilities as nestWinstonModuleUtilities, WinstonModule } from "nest-winston";
import * as winston from "winston";
import { AppModule } from "./app.module";
import * as packageJson from "../package.json";

/**
 * Bootstraps the application.
 */
async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule);
    const configService = app.get(ConfigService);
    const format = winston.format.combine(winston.format.timestamp(), nestWinstonModuleUtilities.format.nestLike());

    const logger = WinstonModule.createLogger({
        level: configService.get<string>("logger.logLevel"),
        transports: [
            new winston.transports.Console({ format }),
            new winston.transports.File({ format, filename: configService.get<string>("logger.logFile") }),
        ],
    });

    app.useLogger(logger);
    app.use(helmet());
    app.use(morgan("tiny"));
    app.enableCors({ origin: configService.get<string>("server.publicUrl") });
    app.setGlobalPrefix("api/console");
    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            whitelist: true,
            forbidNonWhitelisted: true,
        }),
    );
    app.enableShutdownHooks();

    const options = new DocumentBuilder()
        .setTitle(packageJson.name)
        .setDescription(packageJson.description)
        .setVersion(packageJson.version)
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, options, { operationIdFactory: (_m, method) => method });
    fs.writeFileSync("./openapi-spec.json", JSON.stringify(document));

    if (configService.get("server.enableSwagger")) {
        SwaggerModule.setup("swagger", app, document);
    }

    await app.listen(configService.get<number>("server.port")!);
    logger.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
