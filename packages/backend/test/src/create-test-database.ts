import { DataSource, DataSourceOptions } from "typeorm";
import { getTestDatabaseName } from "./get-test-datasource-options";

/**
 * Creates a per-worker test database and runs migrations.
 * Connects to the default `postgres` database to issue CREATE DATABASE,
 * then creates a new DataSource against the test database to run migrations.
 * @param entities The entity classes to register.
 * @param migrations The migration classes to run.
 */
export async function createTestDatabase(
    entities: DataSourceOptions["entities"] = [],
    migrations: DataSourceOptions["migrations"] = [],
): Promise<void> {
    const dbName = getTestDatabaseName();

    const adminDs = new DataSource({
        type: "postgres",
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
        username: process.env.DB_USER || "db_user",
        password: process.env.DB_PASSWORD || "db_password",
        database: "postgres",
    });

    await adminDs.initialize();

    const dbExists = await adminDs.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (dbExists.length === 0) {
        await adminDs.query(`CREATE DATABASE "${dbName}"`);
    }

    await adminDs.destroy();

    const testDs = new DataSource({
        type: "postgres",
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
        username: process.env.DB_USER || "db_user",
        password: process.env.DB_PASSWORD || "db_password",
        database: dbName,
        entities,
        migrations,
        migrationsRun: true,
    });

    await testDs.initialize();
    await testDs.destroy();
}
