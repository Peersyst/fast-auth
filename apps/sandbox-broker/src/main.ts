import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { utilities as nestWinstonModuleUtilities, WinstonModule } from "nest-winston";
import * as winston from "winston";
import { AppModule } from "./app.module";
import { setUpApp } from "./app.setup";

/**
 * Bootstraps the application.
 */
async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule, { bufferLogs: true });
    const configService = app.get(ConfigService);
    const logger = WinstonModule.createLogger({
        level: configService.get<string>("logger.logLevel"),
        transports: [
            new winston.transports.Console({
                format: winston.format.combine(winston.format.timestamp(), nestWinstonModuleUtilities.format.nestLike()),
            }),
        ],
    });

    app.useLogger(logger);
    setUpApp(app);

    await app.listen(configService.getOrThrow<number>("server.port"));
    logger.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
