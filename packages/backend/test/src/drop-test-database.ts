import { DataSource } from "typeorm";
import { getTestDatabaseName } from "./get-test-datasource-options";

/**
 * Drops the per-worker test database.
 * Connects to the default `postgres` database to issue DROP DATABASE.
 */
export async function dropTestDatabase(): Promise<void> {
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
    await adminDs.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    await adminDs.destroy();
}
