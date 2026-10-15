import { SetMetadata } from "@nestjs/common";
import type { Role } from "../../auth/session-user";

export const ROLES_KEY = "console:roles";

export const Roles = (...roles: Role[]): MethodDecorator & ClassDecorator => SetMetadata(ROLES_KEY, roles);
