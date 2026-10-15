import type { NestExpressApplication } from "@nestjs/platform-express";
import { Test } from "@nestjs/testing";
import { DataSource } from "typeorm";
import { AppModule } from "../../src/app.module";
import { loadConfig } from "../../src/config";
import { configureApp } from "../../src/configure-app";
import { JWT_KEY_SET } from "../../src/modules/auth/jwt-key-set";
import { EMAILER } from "../../src/modules/notifications/emailer";
import { SLACK_NOTIFIER } from "../../src/modules/notifications/slack-notifier";
import { testKeySet } from "./tokens";

export async function createTestApp(): Promise<NestExpressApplication> {
    const config = loadConfig();
    const moduleRef = await Test.createTestingModule({ imports: [AppModule.forRoot(config)] })
        .overrideProvider(JWT_KEY_SET)
        .useValue(await testKeySet())
        .overrideProvider(EMAILER)
        .useValue({ send: jest.fn() })
        .overrideProvider(SLACK_NOTIFIER)
        .useValue({ notify: jest.fn() })
        .compile();
    const app = moduleRef.createNestApplication<NestExpressApplication>({ bufferLogs: true });
    configureApp(app, config);
    return app.init();
}

export async function resetDatabase(app: NestExpressApplication): Promise<void> {
    const dataSource = app.get(DataSource);
    await dataSource.query('TRUNCATE "dapp_events", "dapps", "setting_events", "settings"');
    await dataSource.query(`INSERT INTO "settings" ("key", "value") VALUES ('auto_approval', '{"enabled": false}')`);
}
