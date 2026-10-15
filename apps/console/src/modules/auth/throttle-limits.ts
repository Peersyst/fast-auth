import { applyDecorators, SetMetadata } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";

export const THROTTLED_KEY = "console:throttled";

const perMinute = (limit: number) => (): MethodDecorator & ClassDecorator =>
    applyDecorators(SetMetadata(THROTTLED_KEY, true), Throttle({ default: { limit, ttl: 60_000 } }));

export const SubmitDappThrottle = perMinute(5);
export const EditDappThrottle = perMinute(10);
export const AdminMutationThrottle = perMinute(60);
