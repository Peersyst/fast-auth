import { SetMetadata } from "@nestjs/common";

export const IS_PUBLIC_KEY = "console:isPublic";

/**
 * Lets requests without an ID token through the route.
 * @returns The decorator.
 */
export const Public = (): MethodDecorator & ClassDecorator => SetMetadata(IS_PUBLIC_KEY, true);
