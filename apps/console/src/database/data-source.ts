import { join } from "node:path";
import type { DataSourceOptions } from "typeorm";
import type { ConsoleConfig } from "../config/console-config";

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
        connectTimeoutMS: 5_000,
        extra: { options: `-c lock_timeout=${database.lockTimeoutMs}` },
        // Makes generated uuid columns default to gen_random_uuid().
        uuidExtension: "pgcrypto",
        entities: [],
        migrations: [join(__dirname, "migrations", "*.{ts,js}")],
        synchronize: false,
    };
}
