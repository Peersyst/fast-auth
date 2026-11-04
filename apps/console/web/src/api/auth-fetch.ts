import { GenericError, type Auth0ContextInterface } from "@auth0/auth0-react";
import { ApiError } from "./client";

type TokenSource = Pick<Auth0ContextInterface, "getIdTokenClaims" | "getAccessTokenSilently">;

const RENEW_BEFORE_EXPIRY_MS = 60_000;

const SESSION_ENDED = new Set(["login_required", "consent_required", "interaction_required", "invalid_grant", "missing_refresh_token"]);

export function createAuthFetch(auth: TokenSource): (request: Request) => Promise<Response> {
    const renew = async (): Promise<void> => {
        try {
            await auth.getAccessTokenSilently({ cacheMode: "off" });
        } catch (error) {
            if (error instanceof GenericError && SESSION_ENDED.has(error.error)) {
                throw new ApiError({ statusCode: 401, code: "UNAUTHENTICATED", message: error.message });
            }
            throw error;
        }
    };

    const idToken = async (): Promise<string> => {
        let claims = await auth.getIdTokenClaims();
        if (!claims || (claims.exp ?? 0) * 1000 - Date.now() < RENEW_BEFORE_EXPIRY_MS) {
            await renew();
            claims = await auth.getIdTokenClaims();
        }
        if (!claims) throw new ApiError({ statusCode: 401, code: "UNAUTHENTICATED", message: "No ID token: the user is not signed in" });
        return claims.__raw;
    };

    const send = async (request: Request): Promise<Response> => {
        const attempt = request.clone();
        attempt.headers.set("Authorization", `Bearer ${await idToken()}`);
        return fetch(attempt);
    };

    return async (request) => {
        const response = await send(request);
        if (response.status !== 401) return response;
        await renew();
        return send(request);
    };
}
