import { applyDecorators, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiForbiddenResponse, ApiUnauthorizedResponse } from "@nestjs/swagger";
import { ApiException } from "@backend/core/exceptions";
import { AdminGuard } from "../guard/admin.guard";
import { Auth0JwtGuard } from "../guard/auth0-jwt.guard";
import { VerifiedEmailGuard } from "../guard/verified-email.guard";

/**
 * Requires a valid Auth0 ID token with an email, whether or not it is verified.
 * @returns The decorator.
 */
export function SignedIn(): ClassDecorator & MethodDecorator {
    return applyDecorators(
        UseGuards(Auth0JwtGuard),
        ApiBearerAuth(),
        ApiUnauthorizedResponse({ type: ApiException }),
        ApiForbiddenResponse({ type: ApiException }),
    );
}

/**
 * Requires a valid Auth0 ID token with a verified email.
 * @returns The decorator.
 */
export function Authenticated(): ClassDecorator & MethodDecorator {
    return applyDecorators(
        UseGuards(Auth0JwtGuard, VerifiedEmailGuard),
        ApiBearerAuth(),
        ApiUnauthorizedResponse({ type: ApiException }),
        ApiForbiddenResponse({ type: ApiException }),
    );
}

/**
 * Requires a valid Auth0 ID token with a verified email in ADMIN_EMAILS.
 * @returns The decorator.
 */
export function AdminAuthenticated(): ClassDecorator & MethodDecorator {
    return applyDecorators(
        UseGuards(Auth0JwtGuard, VerifiedEmailGuard, AdminGuard),
        ApiBearerAuth(),
        ApiUnauthorizedResponse({ type: ApiException }),
        ApiForbiddenResponse({ type: ApiException }),
    );
}
