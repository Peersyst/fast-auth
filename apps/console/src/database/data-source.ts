import { join } from "node:path";
import type { DataSourceOptions } from "typeorm";
import type { ConsoleConfig } from "../config/console-config";

/**
 * Maps the database config to TypeORM options, with the migrations attached and synchronize off.
 * @param config The validated config.
 * @returns The data source options.
 */
export function dataSourceOptions(config: ConsoleConfig): DataSourceOptions {
    const { database } = config;
    return {
        type: "postgres",
        host: database.host,
        port: database.port,
        database: database.name,
        username: database.user,
        password: database.password,
        ssl: database.ssl,
        poolSize: database.poolSize,
        connectTimeoutMS: database.connectTimeoutMs,
        extra: { options: `-c lock_timeout=${database.lockTimeoutMs}` },
        // Makes generated uuid columns default to gen_random_uuid().
        uuidExtension: "pgcrypto",
        entities: [],
        migrations: [join(__dirname, "migrations", "*.{ts,js}")],
        synchronize: false,
    };
}
