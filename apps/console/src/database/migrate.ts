import { DataSource } from "typeorm";
import type { ConsoleConfig } from "../config/console-config";
import { dataSourceOptions } from "./data-source";

const MIGRATION_LOCK_KEY = 7_041_826_013;

export async function runMigrations(config: ConsoleConfig): Promise<void> {
    const dataSource = await new DataSource(dataSourceOptions(config)).initialize();
    const lockRunner = dataSource.createQueryRunner();
    try {
        // lock_timeout also bounds advisory locks, and waiting for another migrator is expected.
        await lockRunner.query("SET lock_timeout = 0");
        await lockRunner.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
        await dataSource.runMigrations();
    } finally {
        await lockRunner.release();
        await dataSource.destroy();
    }
}
