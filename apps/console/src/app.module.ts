import type { DynamicModule } from "@nestjs/common";
import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import type { ConsoleConfig } from "./config/console-config";
import { CONSOLE_CONFIG } from "./config/console-config";
import { dataSourceOptions } from "./database/data-source";
import { AdminModule } from "./modules/admin/admin.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ClientConfigModule } from "./modules/client-config/client-config.module";
import { DappsModule } from "./modules/dapps/dapps.module";
import { HealthModule } from "./modules/health/health.module";

@Module({
    imports: [AuthModule, HealthModule, ClientConfigModule, DappsModule, AdminModule],
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
