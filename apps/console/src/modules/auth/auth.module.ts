import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { ThrottleConfig } from "../../config/throttle.config";
import { THROTTLE_LIMIT_KEY } from "./decorator/throttled.decorator";
import { AdminGuard } from "./guard/admin.guard";
import { Auth0JwtGuard } from "./guard/auth0-jwt.guard";
import { ThrottlerBySubGuard } from "./guard/throttler-by-sub.guard";
import { VerifiedEmailGuard } from "./guard/verified-email.guard";
import { JWT_KEY_SET, jwtKeySetProvider } from "./jwt-key-set";
import { MeController } from "./me.controller";
import { Auth0JwtStrategy } from "./strategy/auth0-jwt.strategy";

@Module({
    imports: [
        ThrottlerModule.forRootAsync({
            inject: [ConfigService, Reflector],
            useFactory: (configService: ConfigService, reflector: Reflector) => {
                const limits = configService.get<ThrottleConfig>("throttle")!;
                return [
                    {
                        ttl: 60_000,
                        limit: (context) => limits[reflector.get<keyof ThrottleConfig>(THROTTLE_LIMIT_KEY, context.getHandler())],
                    },
                ];
            },
        }),
    ],
    controllers: [MeController],
    providers: [jwtKeySetProvider, Auth0JwtStrategy, Auth0JwtGuard, VerifiedEmailGuard, AdminGuard, ThrottlerBySubGuard],
    exports: [JWT_KEY_SET, Auth0JwtGuard, VerifiedEmailGuard, AdminGuard, ThrottlerBySubGuard],
})
export class AuthModule {}
