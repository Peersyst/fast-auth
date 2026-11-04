import type { DynamicModule } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import type { ConsoleConfig } from "./config/console-config";
import { dataSourceOptions } from "./database/data-source";
import { AuthModule } from "./modules/auth/auth.module";
import { ClientConfigModule } from "./modules/client-config/client-config.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
    imports: [AuthModule, HealthModule, ClientConfigModule],
})
export class AppModule {
    /**
     * Builds the root module around an already validated config, which ConfigService then serves.
     * @param config The config from loadConfig.
     * @returns The root module with config and database wired in.
     */
    static forRoot(config: ConsoleConfig): DynamicModule {
        return {
            module: AppModule,
            imports: [
                ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true, skipProcessEnv: true, load: [() => config] }),
                // main.ts has already connected to run migrations, so retrying here only delays a failure.
                TypeOrmModule.forRoot({ ...dataSourceOptions(config), toRetry: () => false }),
            ],
        };
    }
}
