import "../env.cjs";
import dataSource from "../../src/database/cli-data-source";

/**
 * Drops the e2e database after the integration suite.
 */
export default async function globalTeardown(): Promise<void> {
    await dataSource.initialize();
    await dataSource.dropDatabase();
    await dataSource.destroy();
}
