import { MiddlewareConsumer, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import configuration from "./config";
import { join } from "path";
import * as OpenApiValidator from "express-openapi-validator";
import { APP_FILTER } from "@nestjs/core";
import { ErrorFilter } from "@backend/core/exceptions";
import { RelayerModule } from "./modules/relayer/relayer.module";
import { PrometheusModule } from "@willsoto/nestjs-prometheus";
import { getConfigEnv } from "@backend/config";

@Module({
    imports: [
        ConfigModule.forRoot({
            load: [async () => configuration()],
            expandVariables: true,
            isGlobal: true,
        }),
        PrometheusModule.registerAsync({
            inject: [ConfigService],
            imports: [ConfigModule],
            useFactory: async (config: ConfigService) => {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                return {
                    defaultLabels: {
                        app: config.get("server.name"),
                        environment: getConfigEnv(),
                    },
                };
            },
        }),
        RelayerModule,
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
                        allowUnknownQueryParameters: true,
                        coerceTypes: false,
                    },
                    validateResponses: false,
                    validateFormats: "full",
                }),
            )
            .forRoutes("*");
    }
}
