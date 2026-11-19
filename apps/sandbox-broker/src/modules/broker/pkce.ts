import { createHash, randomBytes } from "crypto";

// A SHA-256 digest in base64url, without padding, is always 43 characters.
const S256_CHALLENGE = /^[A-Za-z0-9_-]{43}$/;
const VERIFIER = /^[A-Za-z0-9._~-]{43,128}$/;

/**
 * Creates an unguessable token, for flow ids, codes, cookie bindings and PKCE verifiers.
 * @returns A token of 32 random bytes, in base64url.
 */
export const randomToken = (): string => randomBytes(32).toString("base64url");

/**
 * Derives the S256 code challenge of a PKCE verifier.
 * @param verifier The verifier.
 * @returns The challenge.
 */
export const s256 = (verifier: string): string => createHash("sha256").update(verifier).digest("base64url");

/**
 * Whether a value is a well-formed S256 code challenge.
 * @param value The value.
 * @returns True if it is.
 */
export const isS256Challenge = (value: unknown): value is string => typeof value === "string" && S256_CHALLENGE.test(value);

/**
 * Whether a PKCE verifier is well formed and matches the challenge sent with the authorize request.
 * @param verifier The verifier the token request sent.
 * @param challenge The challenge the authorize request sent.
 * @returns True if it matches.
 */
export const verifierMatches = (verifier: unknown, challenge: string): boolean =>
    typeof verifier === "string" && VERIFIER.test(verifier) && s256(verifier) === challenge;
