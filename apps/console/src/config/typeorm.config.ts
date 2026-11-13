import { DataSourceOptions } from "typeorm";
import { consoleDatabaseConfig } from "@database/console/config";

export type NestConnectionOptions = DataSourceOptions & {
    autoLoadEntities?: boolean;
};

/**
 * Gets the Nest TypeORM configuration.
 * @returns The Nest TypeORM configuration.
 */
export function getNestTypeORMConfig(): NestConnectionOptions {
    return {
        ...consoleDatabaseConfig,
        autoLoadEntities: true,
    };
}
