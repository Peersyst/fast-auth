import { MiddlewareConsumer, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { TypeOrmModule, TypeOrmModuleOptions } from "@nestjs/typeorm";
import * as OpenApiValidator from "express-openapi-validator";
import { join } from "path";
import { CommandModule } from "nestjs-command/dist/command.module.js";
import { getConfigEnv } from "@backend/config";
import { PrometheusModule } from "@willsoto/nestjs-prometheus";
import configuration from "./config";
import { HealthModule } from "./modules/health/health.module";
import { AuthModule } from "./modules/auth/auth.module";
import { AdminModule } from "./modules/admin/admin.module";
import { DappModule } from "./modules/dapp/dapp.module";
import { ScriptModule } from "./modules/script/script.module";
import { SettingModule } from "./modules/setting/setting.module";
import { BUSINESS_EXCEPTION_FILTER } from "./modules/common/exception/business-exception.filter";

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
        SettingModule,
        CommandModule,
        ScriptModule,
    ],
    providers: [BUSINESS_EXCEPTION_FILTER],
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
