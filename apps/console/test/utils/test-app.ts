import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { AppModule } from "../../src/app.module";
import { loadConfig } from "../../src/config";
import { configureApp } from "../../src/configure-app";

export async function createTestApp(): Promise<NestExpressApplication> {
    const config = loadConfig();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule.forRoot(config)] }).compile();
    const app = moduleRef.createNestApplication<NestExpressApplication>({ bufferLogs: true });
    configureApp(app, config);
    return app.init();
}
