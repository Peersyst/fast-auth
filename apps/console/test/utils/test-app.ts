import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { AppModule } from "../../src/app.module";
import { loadConfig } from "../../src/config";
import { configureApp } from "../../src/configure-app";
import { JWT_KEY_SET } from "../../src/modules/auth/jwt-key-set";
import { EMAILER } from "../../src/modules/notifications/emailer";
import { SLACK_NOTIFIER } from "../../src/modules/notifications/slack-notifier";
import { EmailerMock, SlackNotifierMock } from "../mocks";
import { testKeySet } from "./tokens";

/**
 * Builds the app from test/env.cjs and configures it as main.ts does, without listening.
 * @returns The initialised app.
 */
export async function createTestApp(): Promise<NestExpressApplication> {
    const config = loadConfig();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule.forRoot(config)] })
        .overrideProvider(JWT_KEY_SET)
        .useValue(await testKeySet())
        .overrideProvider(EMAILER)
        .useValue(new EmailerMock())
        .overrideProvider(SLACK_NOTIFIER)
        .useValue(new SlackNotifierMock())
        .compile();
    const app = moduleRef.createNestApplication<NestExpressApplication>({ bufferLogs: true });
    configureApp(app, config);
    return app.init();
}

/**
 * Empties every entity table and restores the default auto-approval setting.
 * @param app The app whose database to empty.
 */
export async function resetDatabase(app: NestExpressApplication): Promise<void> {
    const dataSource = app.get(DataSource);
    const tables = dataSource.entityMetadatas.map(({ tableName }) => `"${tableName}"`);
    await dataSource.query(`TRUNCATE ${tables.join(", ")}`);
    await dataSource.query(`INSERT INTO "settings" ("key", "value") VALUES ('auto_approval', '{"enabled": false}')`);
}
