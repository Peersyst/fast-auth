import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { createHash, randomBytes } from "crypto";
import { Auth0Config } from "../../config/auth0.config";
import { AuthorizeRequest } from "./requests/authorize.request";
import { CallbackRequest } from "./requests/callback.request";
import { TokenRequest } from "./requests/token.request";

/** A dApp's sign-in on its way through Auth0. */
export interface Flow {
    redirectUri: string;
    state: string;
    responseMode: "query" | "web_message";
    codeChallenge: string;
    /** The broker's own PKCE verifier. Its client has no secret, so this is what redeems Auth0's code. */
    verifier: string;
}

const TTL_MS = 10 * 60 * 1000;

/**
 * Derives a PKCE S256 challenge.
 * @param verifier The verifier.
 * @returns The challenge.
 */
const s256 = (verifier: string): string => createHash("sha256").update(verifier).digest("base64url");

/**
 * Signs any dApp in on the sandbox tenant through the broker's one Auth0 client. To the dApp the broker is an Auth0
 * domain: it runs its own sign-in with Auth0 and hands the dApp a code of its own, which redeems for Auth0's tokens.
 */
@Injectable()
export class BrokerService {
    private readonly auth0: Auth0Config;
    private readonly callbackUrl: string;
    private readonly flows = new Map<string, Flow>();
    private readonly codes = new Map<string, { flow: Flow; tokens: unknown }>();

    constructor(config: ConfigService) {
        this.auth0 = config.getOrThrow<Auth0Config>("auth0");
        this.callbackUrl = `${config.getOrThrow<string>("server.publicUrl")}/callback`;
    }

    /**
     * Starts a dApp's sign-in with Auth0, on the broker's client and callback.
     * @param request The dApp's authorize request.
     * @returns The Auth0 URL to send the user to.
     */
    authorizeUrl(request: AuthorizeRequest): string {
        if (request.client_id !== this.auth0.clientId) throw new BadRequestException("Unknown client_id");
        const { client_id, redirect_uri, state, code_challenge, response_mode, ...forward } = request;
        const verifier = randomBytes(32).toString("base64url");
        const flow: Flow = {
            redirectUri: redirect_uri,
            state,
            responseMode: response_mode ?? "query",
            codeChallenge: code_challenge,
            verifier,
        };
        const params = new URLSearchParams({
            client_id,
            response_type: "code",
            redirect_uri: this.callbackUrl,
            state: this.keep(this.flows, flow),
            code_challenge: s256(verifier),
            code_challenge_method: "S256",
        });
        for (const [name, value] of Object.entries(forward)) if (value !== undefined) params.set(name, value);
        // A sign-in that only identifies the user always shows the login screen, so that no site learns who the user is
        // without them doing anything. A signing request ends on the consent form, which is the user's own action.
        if (!forward.transaction && !forward.delegateAction && !forward.nep413) params.set("prompt", "login");
        return `https://${this.auth0.domain}/authorize?${params}`;
    }

    /**
     * Finishes a sign-in when Auth0 sends the user back, redeeming Auth0's code with the broker's PKCE verifier.
     * @param request Auth0's callback.
     * @returns The sign-in, and what to send its dApp: a code of the broker's, or Auth0's error.
     */
    async finish(request: CallbackRequest): Promise<{ flow: Flow; params: Record<string, string> }> {
        const flow = this.take(this.flows, request.state);
        if (!flow) throw new BadRequestException("This sign-in has expired. Go back to the app and try again.");
        if (!request.code) {
            return { flow, params: { error: request.error ?? "server_error", error_description: request.error_description ?? "" } };
        }
        const response = await fetch(`https://${this.auth0.domain}/oauth/token`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                grant_type: "authorization_code",
                client_id: this.auth0.clientId,
                code: request.code,
                code_verifier: flow.verifier,
                redirect_uri: this.callbackUrl,
            }),
        });
        if (!response.ok) return { flow, params: { error: "server_error", error_description: "Auth0 refused the code" } };
        return { flow, params: { code: this.keep(this.codes, { flow, tokens: await response.json() }) } };
    }

    /**
     * Hands the dApp Auth0's tokens, once, if its PKCE verifier matches the challenge it started with.
     * @param request The dApp's token request.
     * @returns Auth0's tokens.
     */
    redeem(request: TokenRequest): unknown {
        const issued = this.take(this.codes, request.code);
        if (!issued || issued.flow.redirectUri !== request.redirect_uri || issued.flow.codeChallenge !== s256(request.code_verifier)) {
            throw new BadRequestException({ error: "invalid_grant", error_description: "Invalid code" });
        }
        return issued.tokens;
    }

    /**
     * Keeps a value for TTL_MS under a new random key.
     * @param map The map.
     * @param value The value.
     * @returns The key.
     */
    private keep<T>(map: Map<string, T>, value: T): string {
        const key = randomBytes(32).toString("base64url");
        map.set(key, value);
        setTimeout(() => map.delete(key), TTL_MS).unref();
        return key;
    }

    /**
     * Removes a value and returns it, so that each one is used once.
     * @param map The map.
     * @param key The key.
     * @returns The value, if there was one.
     */
    private take<T>(map: Map<string, T>, key: string): T | undefined {
        const value = map.get(key);
        map.delete(key);
        return value;
    }
}
