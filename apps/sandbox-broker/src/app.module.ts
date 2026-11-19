import { Module, ValidationPipe } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_PIPE } from "@nestjs/core";
import configuration from "./config";
import { BrokerModule } from "./modules/broker/broker.module";

@Module({
    imports: [ConfigModule.forRoot({ load: [configuration], isGlobal: true }), BrokerModule],
    // `whitelist` drops every param a request class does not list, so only those reach Auth0.
    providers: [{ provide: APP_PIPE, useValue: new ValidationPipe({ whitelist: true, transform: true }) }],
})
export class AppModule {}
