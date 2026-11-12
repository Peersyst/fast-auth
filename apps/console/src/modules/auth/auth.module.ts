import { Module } from "@nestjs/common";
import { jwtKeySetProvider } from "./jwt-key-set";
import { MeController } from "./me.controller";

@Module({
    controllers: [MeController],
    providers: [jwtKeySetProvider],
    exports: [jwtKeySetProvider],
})
export class AuthModule {}
