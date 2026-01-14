import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER } from "@nestjs/core";
import { IssuerModule } from "./modules/issuer/issuer.module";
import configuration from "./config";
import { HttpExceptionFilter } from "./common/filters/http-exception.filter";

@Module({
    imports: [
        ConfigModule.forRoot({
            load: [() => configuration()],
            isGlobal: true,
            envFilePath: [".env"],
        }),
        IssuerModule,
    ],
    providers: [
        {
            provide: APP_FILTER,
            useClass: HttpExceptionFilter,
        },
    ],
})
export class AppModule {}
