import { DataSourceOptions } from "typeorm";

/**
 * Returns the test database name based on the Jest worker ID.
 * Each worker gets its own database to enable parallel execution.
 * @returns The test database name (e.g., `db_test_1`).
 */
export function getTestDatabaseName(): string {
    const workerId = process.env.JEST_WORKER_ID || "1";
    return `db_test_${workerId}`;
}

/**
 * Returns TypeORM DataSource options configured for the test database.
 * Reads connection details from environment variables with sensible defaults
 * matching the development Postgres in the console README.
 * @param entities The entity classes to register.
 * @param migrations The migration classes to run.
 * @returns TypeORM DataSource options for the test database.
 */
export function getTestDataSourceOptions(
    entities: DataSourceOptions["entities"] = [],
    migrations: DataSourceOptions["migrations"] = [],
): DataSourceOptions {
    return {
        type: "postgres",
        host: process.env.DB_HOST || "localhost",
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
        username: process.env.DB_USER || "db_user",
        password: process.env.DB_PASSWORD || "db_password",
        database: getTestDatabaseName(),
        synchronize: false,
        migrationsRun: true,
        entities,
        migrations,
    };
}
