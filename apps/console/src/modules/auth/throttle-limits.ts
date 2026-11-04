import { SetMetadata } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Reflector } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import type { ConsoleConfig } from "../../config/console-config";

export const THROTTLE_LIMIT_KEY = "console:throttle-limit";

export type ThrottleLimit = keyof ConsoleConfig["throttle"];

/**
 * Builds a decorator that marks a route throttled and limits it per subject to the requests per minute in the given throttle setting.
 * @param limit The throttle setting that holds the route's requests per minute.
 * @returns The decorator factory.
 */
const perMinute = (limit: ThrottleLimit) => (): MethodDecorator & ClassDecorator => SetMetadata(THROTTLE_LIMIT_KEY, limit);

export const SubmitDappThrottle = perMinute("submitDappPerMinute");
export const EditDappThrottle = perMinute("editDappPerMinute");
export const AdminMutationThrottle = perMinute("adminMutationPerMinute");

// Only routes marked with a decorator above are limited, each with the limit its throttle setting holds.
export const ConfiguredThrottlerModule = ThrottlerModule.forRootAsync({
    inject: [ConfigService, Reflector],
    useFactory: (configService: ConfigService<ConsoleConfig, true>, reflector: Reflector) => {
        const limits = configService.get("throttle", { infer: true });
        return [
            {
                ttl: 60_000,
                limit: (context) =>
                    limits[reflector.getAllAndOverride<ThrottleLimit>(THROTTLE_LIMIT_KEY, [context.getHandler(), context.getClass()])],
            },
        ];
    },
});
