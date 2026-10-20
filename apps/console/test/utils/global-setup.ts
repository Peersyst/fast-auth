import "./load-env";
import { loadConfig } from "../../src/config";
import dataSource from "../../src/database/cli-data-source";
import { runMigrations } from "../../src/database/migrate";

export default async function globalSetup(): Promise<void> {
    // Another branch's e2e run can leave tables and migration rows that this branch's migrations don't know.
    await dataSource.initialize();
    await dataSource.dropDatabase();
    await dataSource.destroy();
    await runMigrations(loadConfig());
}
