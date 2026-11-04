import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { RolesGuard } from "./guards/roles.guard";
import { ThrottlerBySubGuard } from "./guards/throttler-by-sub.guard";
import { VerifiedEmailGuard } from "./guards/verified-email.guard";
import { jwtKeySetProvider } from "./jwt-key-set";
import { MeController } from "./me.controller";
import { ConfiguredThrottlerModule } from "./throttle-limits";

@Module({
    imports: [ConfiguredThrottlerModule],
    controllers: [MeController],
    providers: [
        jwtKeySetProvider,
        { provide: APP_GUARD, useClass: JwtAuthGuard },
        { provide: APP_GUARD, useClass: VerifiedEmailGuard },
        { provide: APP_GUARD, useClass: RolesGuard },
        { provide: APP_GUARD, useClass: ThrottlerBySubGuard },
    ],
})
export class AuthModule {}
