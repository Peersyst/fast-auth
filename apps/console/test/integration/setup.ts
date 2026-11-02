import "../env.cjs";
import { loadConfig } from "../../src/config";
import dataSource from "../../src/database/cli-data-source";
import { runMigrations } from "../../src/database/migrate";

/**
 * Recreates the e2e database and runs the migrations once before the integration suite.
 */
export default async function globalSetup(): Promise<void> {
    // Another branch's integration run can leave tables and migration rows that this branch's migrations don't know.
    await dataSource.initialize();
    await dataSource.dropDatabase();
    await dataSource.destroy();
    await runMigrations(loadConfig());
}
