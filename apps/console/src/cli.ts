import { NestFactory } from "@nestjs/core";
import { CommandModule } from "nestjs-command/dist/command.module.js";
import { CommandService } from "nestjs-command/dist/command.service.js";
import { AppModule } from "./app.module";

/**
 * Bootstraps the CLI application.
 */
async function bootstrap(): Promise<void> {
    const app = await NestFactory.createApplicationContext(AppModule, {
        logger: ["error"],
    });

    try {
        await app.select(CommandModule).get(CommandService).exec();
        await app.close();
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        await app.close();
        process.exit(1);
    }
}

bootstrap();
