import { Module } from "@nestjs/common";
import { jwtKeySetProvider } from "./jwt-key-set";
import { MeController } from "./me.controller";
import { Auth0JwtStrategy } from "./strategy/auth0-jwt.strategy";

@Module({
    controllers: [MeController],
    providers: [jwtKeySetProvider, Auth0JwtStrategy],
})
export class AuthModule {}
