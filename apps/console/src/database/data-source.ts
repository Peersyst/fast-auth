import { join } from "node:path";
import type { DataSourceOptions } from "typeorm";
import type { ConsoleConfig } from "../config/console-config";
import { DappEventEntity } from "../modules/dapps/entities/dapp-event.entity";
import { DappEntity } from "../modules/dapps/entities/dapp.entity";

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
        // Init creates citext, and gen_random_uuid() is built in since Postgres 13.
        installExtensions: false,
        entities: [DappEntity, DappEventEntity],
        migrations: [join(__dirname, "migrations", "*.{ts,js}")],
        synchronize: false,
    };
}
