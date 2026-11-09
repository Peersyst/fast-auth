import { Module } from "@nestjs/common";
import { AdminGuard } from "./guard/admin.guard";
import { Auth0JwtGuard } from "./guard/auth0-jwt.guard";
import { VerifiedEmailGuard } from "./guard/verified-email.guard";
import { JWT_KEY_SET, jwtKeySetProvider } from "./jwt-key-set";
import { MeController } from "./me.controller";
import { Auth0JwtStrategy } from "./strategy/auth0-jwt.strategy";

@Module({
    controllers: [MeController],
    providers: [jwtKeySetProvider, Auth0JwtStrategy, Auth0JwtGuard, VerifiedEmailGuard, AdminGuard],
    exports: [JWT_KEY_SET, Auth0JwtGuard, VerifiedEmailGuard, AdminGuard],
})
export class AuthModule {}
