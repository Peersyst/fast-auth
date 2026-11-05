import { DataSourceOptions } from "typeorm";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";
import { buildConfig, ConfigValidators, validPort } from "@backend/config";
import * as entities from "./entities";
import * as migrations from "./migrations";

type ConsoleDatabaseConfig = PostgresConnectionOptions & { lockTimeoutMs: number };

const config = buildConfig<ConsoleDatabaseConfig>(
    {
        host: process.env.DB_HOST || { default: "db", development: "localhost" },
        port: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 5432,
        username: process.env.DB_USER || "db_user",
        password: process.env.DB_PASSWORD || "db_password",
        database: process.env.DB_DATABASE || "db_database",
        ssl: process.env.DB_SSL === "true",
        poolSize: process.env.DB_POOL_SIZE ? parseInt(process.env.DB_POOL_SIZE) : 10,
        connectTimeoutMS: process.env.DB_CONNECT_TIMEOUT_MS ? parseInt(process.env.DB_CONNECT_TIMEOUT_MS) : 5000,
        lockTimeoutMs: process.env.DB_LOCK_TIMEOUT_MS ? parseInt(process.env.DB_LOCK_TIMEOUT_MS) : 10000,
        type: "postgres",
        synchronize: false,
        migrationsRun: true,
        entities: Object.values(entities),
        migrations: Object.values(migrations),
    },
    {
        port: validPort,
        ssl: () => process.env.DB_SSL === undefined || ["true", "false"].includes(process.env.DB_SSL),
        poolSize: (size: number) => Number.isInteger(size) && size >= 2,
        connectTimeoutMS: (ms: number) => Number.isInteger(ms) && ms > 0,
        lockTimeoutMs: (ms: number) => Number.isInteger(ms) && ms > 0,
    } as ConfigValidators<ConsoleDatabaseConfig>,
);

const { lockTimeoutMs, ...connection } = config;

export const consoleDatabaseConfig: DataSourceOptions = {
    ...connection,
    extra: { options: `-c lock_timeout=${lockTimeoutMs}` },
};
