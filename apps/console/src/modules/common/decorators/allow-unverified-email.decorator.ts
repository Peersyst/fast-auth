import { SetMetadata } from "@nestjs/common";

export const ALLOW_UNVERIFIED_EMAIL_KEY = "console:allowUnverifiedEmail";

export const AllowUnverifiedEmail = (): MethodDecorator & ClassDecorator => SetMetadata(ALLOW_UNVERIFIED_EMAIL_KEY, true);
