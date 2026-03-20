import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";
import { PrometheusModule } from "@willsoto/nestjs-prometheus";
import { IssuerModule } from "./modules/issuer/issuer.module";
import { HealthModule } from "./modules/health/health.module";
import configuration from "./config";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

@Module({
    imports: [
        ConfigModule.forRoot({
            load: [() => configuration()],
            isGlobal: true,
            envFilePath: [".env"],
        }),
        PrometheusModule.registerAsync({
            inject: [ConfigService],
            imports: [ConfigModule],
            useFactory: async (config: ConfigService) => {
                await new Promise((resolve) => setTimeout(resolve, 2000));
                return {
                    defaultLabels: {
                        app: config.get("prometheus.appName"),
                        environment: config.get("prometheus.env"),
                    },
                };
            },
        }),
        IssuerModule,
        HealthModule,
    ],
    providers: [
        {
            provide: APP_FILTER,
            useClass: HttpExceptionFilter,
        },
    ],
})
export class AppModule {}
