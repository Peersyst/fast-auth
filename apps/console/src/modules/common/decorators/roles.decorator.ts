import { SetMetadata } from "@nestjs/common";
import type { Role } from "../../auth/session-user";

export const ROLES_KEY = "console:roles";

/**
 * Limits the route to users with one of the given roles.
 * @param roles The roles allowed.
 * @returns The decorator.
 */
export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator => SetMetadata(ROLES_KEY, roles);
