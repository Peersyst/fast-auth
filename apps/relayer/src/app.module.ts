import { Module } from "@nestjs/common";
import { FirebaseModule } from "./modules/firebase/firebase.module";
import { AuthModule } from "./modules/auth/auth.module";
import { ConfigModule } from "@nestjs/config";
import config from "./config";
import { GoogleModule } from "./modules/auth/modules/google/google.module";

@Module({
    imports: [
        ConfigModule.forRoot({
            load: [config],
            expandVariables: true,
            isGlobal: true,
        }),
        FirebaseModule,
        AuthModule,
        GoogleModule,
    ],
})
export class AppModule {}
