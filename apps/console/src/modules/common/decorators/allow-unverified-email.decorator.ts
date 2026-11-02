import { SetMetadata } from "@nestjs/common";

export const ALLOW_UNVERIFIED_EMAIL_KEY = "console:allowUnverifiedEmail";

/**
 * Lets a signed-in user whose email is not verified through the route.
 * @returns The decorator.
 */
export const AllowUnverifiedEmail = (): MethodDecorator & ClassDecorator => SetMetadata(ALLOW_UNVERIFIED_EMAIL_KEY, true);
