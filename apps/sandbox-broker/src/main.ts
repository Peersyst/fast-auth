import { ConfigService } from "@nestjs/config";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

/**
 * Bootstraps the application.
 */
async function bootstrap(): Promise<void> {
    const app = await NestFactory.create(AppModule);
    // dApps on any origin redeem their code from the page.
    app.enableCors();
    await app.listen(app.get(ConfigService).getOrThrow<number>("server.port"));
}
bootstrap();
