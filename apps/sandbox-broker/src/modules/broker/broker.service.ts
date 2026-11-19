import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Auth0Config } from "../../config/auth0.config";
import { BrokerConfig } from "../../config/broker.config";
import { ServerConfig } from "../../config/server.config";
import { Auth0TokenClient } from "./auth0-token.client";
import { parseAuthorizeRequest } from "./authorize-request";
import { DappError, PageError, TokenError } from "./broker.errors";
import { Delivery, DappReturn, Query, TokenSet } from "./broker.types";
import { randomToken, s256, verifierMatches } from "./pkce";
import { redirectOrigin } from "./redirect-uri";
import { TtlStore } from "./ttl-store";

/** A sign-in on its way through Auth0. */
interface Flow {
    dapp: DappReturn;
    codeChallenge: string;
    /** The broker's own PKCE verifier, for Auth0. */
    verifier: string;
    /** The value of the cookie that ties the sign-in to the browser that started it. */
    binding: string;
}

/** Tokens waiting for the dApp to redeem the code the broker handed it. */
interface IssuedCode {
    dapp: DappReturn;
    codeChallenge: string;
    tokens: TokenSet;
    issuedAt: number;
}

const BUSY = "The sandbox is busy. Try again in a few minutes.";

/**
 * Signs dApps in on the sandbox tenant through the broker's one Auth0 client. To the dApp, the broker is an Auth0
 * domain: it takes the dApp's authorize request, runs its own with Auth0, and hands the dApp a code of its own that
 * redeems for Auth0's tokens.
 */
@Injectable()
export class BrokerService {
    private readonly logger = new Logger(BrokerService.name);
    private readonly auth0: Auth0Config;
    private readonly publicUrl: string;
    private readonly callbackUrl: string;
    private readonly flows: TtlStore<Flow>;
    private readonly codes: TtlStore<IssuedCode>;

    constructor(
        config: ConfigService,
        private readonly tokenClient: Auth0TokenClient,
    ) {
        this.auth0 = config.getOrThrow<Auth0Config>("auth0");
        this.publicUrl = config.getOrThrow<ServerConfig>("server").publicUrl;
        this.callbackUrl = `${this.publicUrl}/callback`;
        const { flowTtlMs, codeTtlMs, maxPending } = config.getOrThrow<BrokerConfig>("broker");
        this.flows = new TtlStore(flowTtlMs, maxPending);
        this.codes = new TtlStore(codeTtlMs, maxPending);
    }

    /**
     * Starts a dApp's sign-in.
     * @param query The dApp's authorize request.
     * @returns The Auth0 URL to send the user to, and the flow id and binding the browser has to carry back.
     */
    startSignIn(query: Query): { authorizeUrl: string; flowId: string; binding: string } {
        const { dapp, codeChallenge, forward } = parseAuthorizeRequest(query, this.auth0.clientId, this.publicUrl);
        const flowId = randomToken();
        const binding = randomToken();
        const verifier = randomToken();
        if (!this.flows.put(flowId, { dapp, codeChallenge, verifier, binding })) {
            throw new DappError(dapp, "temporarily_unavailable", BUSY);
        }

        const url = new URL(`https://${this.auth0.domain}/authorize`);
        url.search = new URLSearchParams({
            ...forward,
            client_id: this.auth0.clientId,
            response_type: "code",
            response_mode: "query",
            redirect_uri: this.callbackUrl,
            state: flowId,
            code_challenge: s256(verifier),
            code_challenge_method: "S256",
        }).toString();
        return { authorizeUrl: url.toString(), flowId, binding };
    }

    /**
     * Finishes a sign-in when Auth0 sends the user back, redeeming Auth0's code for the tokens.
     * @param query Auth0's callback params.
     * @param binding The flow cookie the browser carried back.
     * @returns What to send the dApp: a code of the broker's, or Auth0's error.
     */
    async finishSignIn(query: Query, binding: string | undefined): Promise<Delivery> {
        const flow = typeof query.state === "string" ? this.flows.take(query.state) : undefined;
        if (!flow || !binding || binding !== flow.binding) {
            throw new PageError("This sign-in has expired, or was started in another browser. Go back to the app and try again.");
        }
        const { dapp } = flow;

        if (typeof query.error === "string") {
            const params: Record<string, string> = { error: query.error };
            if (typeof query.error_description === "string") params.error_description = query.error_description;
            return { dapp, params };
        }
        if (typeof query.code !== "string") {
            return { dapp, params: { error: "server_error", error_description: "Auth0 sent no code" } };
        }

        let tokens: TokenSet;
        try {
            tokens = await this.tokenClient.exchangeCode(query.code, flow.verifier, this.callbackUrl);
        } catch (error) {
            this.logger.warn(`Could not redeem the Auth0 code: ${(error as Error).message}`);
            return { dapp, params: { error: "server_error", error_description: "The sign-in could not be completed" } };
        }
        const code = randomToken();
        if (!this.codes.put(code, { dapp, codeChallenge: flow.codeChallenge, tokens, issuedAt: Date.now() })) {
            return { dapp, params: { error: "temporarily_unavailable", error_description: BUSY } };
        }
        return { dapp, params: { code } };
    }

    /**
     * Redeems a code the broker handed a dApp, as Auth0's token endpoint would.
     * @param body The token request.
     * @param origin The request's Origin header.
     * @returns Auth0's tokens.
     */
    redeem(body: Query, origin: string | undefined): TokenSet {
        if (body.grant_type !== "authorization_code") {
            throw new TokenError(400, "unsupported_grant_type", "Only authorization_code is supported");
        }
        if (body.client_id !== this.auth0.clientId) {
            throw new TokenError(401, "invalid_client", "Unknown client_id");
        }
        const invalidGrant = (description: string) => new TokenError(400, "invalid_grant", description);
        // Taken before any other check, so that a code is spent by the first attempt whatever its outcome.
        const issued = typeof body.code === "string" ? this.codes.take(body.code) : undefined;
        if (!issued) throw invalidGrant("The code is invalid, expired or already used");
        if (body.redirect_uri !== issued.dapp.redirectUri) throw invalidGrant("redirect_uri does not match the authorize request");
        if (origin !== issued.dapp.origin) throw invalidGrant("The code was issued to another origin");
        if (!verifierMatches(body.code_verifier, issued.codeChallenge)) throw invalidGrant("code_verifier does not match code_challenge");

        // The tokens have aged while the code waited, and the dApp caches them for as long as expires_in says.
        const waited = Math.floor((Date.now() - issued.issuedAt) / 1000);
        return { ...issued.tokens, expires_in: Math.max(0, issued.tokens.expires_in - waited) };
    }

    /**
     * Signs the user out of the sandbox tenant.
     * @param query The dApp's logout request.
     * @returns The Auth0 logout URL, and where to send the user once Auth0 sends them back, if the dApp said.
     */
    logout(query: Query): { logoutUrl: string; returnTo: string | null } {
        if (query.client_id !== undefined && query.client_id !== this.auth0.clientId) {
            throw new PageError("Unknown client_id. Use the NEAR Auth sandbox client id.");
        }
        if (query.returnTo !== undefined && !redirectOrigin(query.returnTo)) {
            throw new PageError("returnTo must be an https URL, or an http one on localhost, with no fragment.");
        }
        const url = new URL(`https://${this.auth0.domain}/v2/logout`);
        url.search = new URLSearchParams({ client_id: this.auth0.clientId, returnTo: `${this.publicUrl}/logout/callback` }).toString();
        return { logoutUrl: url.toString(), returnTo: (query.returnTo as string | undefined) ?? null };
    }

    /**
     * Reads where to send the user after Auth0 signed them out.
     * @param returnTo The URL the logout request asked for, as the browser carried it back.
     * @returns The URL, or null when there is none to go to.
     */
    returnAfterLogout(returnTo: string | undefined): string | null {
        return returnTo && redirectOrigin(returnTo) ? returnTo : null;
    }
}
