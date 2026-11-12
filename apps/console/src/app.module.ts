import { MiddlewareConsumer, Module } from "@nestjs/common";
import { APP_FILTER } from "@nestjs/core";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule, TypeOrmModuleOptions } from "@nestjs/typeorm";
import * as OpenApiValidator from "express-openapi-validator";
import { join } from "path";
import { getConfigEnv } from "@backend/config";
import { ErrorFilter } from "@backend/core/exceptions";
import { PrometheusModule } from "@willsoto/nestjs-prometheus";
import configuration from "./config";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AdminModule } from "./modules/admin/admin.module";
import { DappModule } from "./modules/dapp/dapp.module";

@Module({
    imports: [
        ConfigModule.forRoot({
            load: [async () => configuration()],
            expandVariables: true,
            isGlobal: true,
        }),
        TypeOrmModule.forRootAsync({
            inject: [ConfigService],
            imports: [ConfigModule],
            useFactory: async (config: ConfigService) => {
                return {
                    type: config.get("database.type"),
                    host: config.get("database.host"),
                    port: config.get("database.port"),
                    username: config.get("database.username"),
                    password: config.get<string>("database.password"),
                    database: config.get("database.database"),
                    ssl: config.get("database.ssl"),
                    poolSize: config.get("database.poolSize"),
                    connectTimeoutMS: config.get("database.connectTimeoutMS"),
                    extra: config.get("database.extra"),
                    synchronize: config.get("database.synchronize"),
                    autoLoadEntities: config.get("database.autoLoadEntities"),
                    entities: config.get("database.entities"),
                    migrations: config.get("database.migrations"),
                    migrationsRun: config.get("database.migrationsRun"),
                } as TypeOrmModuleOptions;
            },
        }),
        PrometheusModule.registerAsync({
            inject: [ConfigService],
            imports: [ConfigModule],
            useFactory: async (config: ConfigService) => {
                return {
                    defaultLabels: {
                        app: config.get("server.name"),
                        environment: getConfigEnv(),
                    },
                };
            },
        }),
        AuthModule,
        HealthModule,
        DappModule,
        AdminModule,
    ],
    providers: [{ provide: APP_FILTER, useClass: ErrorFilter }],
})
export class AppModule {
    /**
     * Configures the middleware for the application.
     * @param consumer The middleware consumer.
     */
    configure(consumer: MiddlewareConsumer): void {
        consumer
            .apply(
                ...OpenApiValidator.middleware({
                    apiSpec: join("./openapi-spec.json"),
                    validateRequests: {
                        allowUnknownQueryParameters: false,
                        coerceTypes: false,
                    },
                    validateResponses: false,
                    validateFormats: "full",
                }),
            )
            .forRoutes("{*path}");
    }
}
