import { isApiError } from "@frontend/core/data-access/api/error";

/**
 * Whether the console refused a request's ID token.
 * @param error The request's error.
 * @returns `true` for a 401 answer.
 */
function isUnauthorized(error: unknown): boolean {
    return isApiError(error) && error.body.statusCode === 401;
}

/**
 * Wraps a generated API so that a request the console answers with 401 renews the session and is sent once more. The
 * console can refuse a token the SDK still holds as valid, such as one issued before a key rotation.
 * @param api The generated API, whose methods take the ID token from `OpenAPI.TOKEN` on every call.
 * @param renewSession Renews the session past the token cache.
 * @returns The API with the same methods.
 */
export function withSessionRenewal<Api extends object>(api: Api, renewSession: () => Promise<void>): Api {
    return new Proxy(api, {
        get(target, key, receiver) {
            const member: unknown = Reflect.get(target, key, receiver);
            if (typeof member !== "function") return member;
            return async (...args: unknown[]): Promise<unknown> => {
                try {
                    return await member.apply(target, args);
                } catch (error) {
                    if (!isUnauthorized(error)) throw error;
                    await renewSession();
                    return member.apply(target, args);
                }
            };
        },
    });
}
