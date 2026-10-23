import type { DynamicModule } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import type { ConsoleConfig } from "./config/console-config";
import { CONSOLE_CONFIG } from "./config/console-config";
import { dataSourceOptions } from "./database/data-source";
import { HealthModule } from "./modules/health/health.module";

@Module({
    imports: [HealthModule],
})
export class AppModule {
    static forRoot(config: ConsoleConfig): DynamicModule {
        return {
            module: AppModule,
            global: true,
            // main.ts has already connected to run migrations, so retrying here only delays a failure.
            imports: [TypeOrmModule.forRoot({ ...dataSourceOptions(config), toRetry: () => false })],
            providers: [{ provide: CONSOLE_CONFIG, useValue: config }],
            exports: [CONSOLE_CONFIG],
        };
    }
}
