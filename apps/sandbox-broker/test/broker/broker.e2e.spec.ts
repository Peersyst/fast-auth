import { BROKER } from "./e2e.env";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import type { Server } from "http";
import request from "supertest";
import { AppModule } from "../../src/app.module";
import { setUpApp } from "../../src/app.setup";
import { Auth0TokenClient } from "../../src/modules/broker/auth0-token.client";
import { s256 } from "../../src/modules/broker/pkce";

const DAPP = "https://my-dapp.example";
const REDIRECT_URI = `${DAPP}/callback`;
const VERIFIER = "dapp-verifier-".padEnd(43, "x");
const TOKENS = {
    access_token: "access-token",
    id_token: "id-token",
    token_type: "Bearer",
    expires_in: 60,
    scope: "openid transaction:sign",
};

describe("sandbox broker", () => {
    let app: INestApplication;
    let server: Server;
    const exchangeCode = jest.fn();

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(Auth0TokenClient)
            .useValue({ exchangeCode })
            .compile();
        app = moduleRef.createNestApplication({ logger: false });
        setUpApp(app);
        await app.init();
        server = app.getHttpServer();
    });

    afterAll(async () => {
        await app.close();
    });

    beforeEach(() => {
        exchangeCode.mockReset().mockResolvedValue(TOKENS);
    });

    /**
     * Starts a sign-in the way `auth0-spa-js` does.
     * @param overrides The authorize params to change.
     * @returns Auth0's authorize URL and the flow cookie.
     */
    async function startSignIn(overrides: Record<string, string> = {}) {
        const res = await request(server)
            .get("/authorize")
            .query({
                client_id: "broker-client",
                redirect_uri: REDIRECT_URI,
                response_type: "code",
                response_mode: "query",
                state: "dapp-state",
                nonce: "dapp-nonce",
                scope: "openid profile email",
                code_challenge: s256(VERIFIER),
                code_challenge_method: "S256",
                ...overrides,
            });
        expect(res.status).toBe(302);
        const setCookie = ([] as string[]).concat(res.headers["set-cookie"]);
        return { auth0: new URL(res.headers.location), setCookie: setCookie[0], cookie: setCookie[0].split(";")[0] };
    }

    /**
     * Sends the browser back from Auth0 to the broker's callback.
     * @param auth0 Auth0's authorize URL, whose state names the flow.
     * @param cookie The flow cookie, or nothing.
     * @param params Auth0's callback params.
     * @returns The response.
     */
    function callback(auth0: URL, cookie: string | undefined, params: Record<string, string> = { code: "auth0-code" }) {
        const req = request(server)
            .get("/callback")
            .query({ state: auth0.searchParams.get("state")!, ...params });
        return cookie ? req.set("Cookie", cookie) : req;
    }

    /**
     * Redeems a code the way `auth0-spa-js` does.
     * @param code The broker's code.
     * @param overrides The token params to change.
     * @param origin The calling page's origin.
     * @returns The response.
     */
    function redeem(code: string, overrides: Record<string, string> = {}, origin = DAPP) {
        return request(server)
            .post("/oauth/token")
            .set("Origin", origin)
            .type("form")
            .send({
                client_id: "broker-client",
                grant_type: "authorization_code",
                code,
                code_verifier: VERIFIER,
                redirect_uri: REDIRECT_URI,
                ...overrides,
            });
    }

    /**
     * Runs a redirect sign-in up to the code the broker hands the dApp.
     * @returns The code.
     */
    async function signIn(): Promise<string> {
        const { auth0, cookie } = await startSignIn();
        const res = await callback(auth0, cookie);
        return new URL(res.headers.location).searchParams.get("code")!;
    }

    describe("authorize", () => {
        it("should send the user to Auth0 with the broker's client, callback and PKCE", async () => {
            const { auth0, setCookie } = await startSignIn();

            expect(auth0.origin + auth0.pathname).toBe("https://login.sandbox.example/authorize");
            expect(Object.fromEntries(auth0.searchParams)).toEqual({
                client_id: "broker-client",
                redirect_uri: `${BROKER}/callback`,
                response_type: "code",
                response_mode: "query",
                state: expect.any(String),
                code_challenge: expect.any(String),
                code_challenge_method: "S256",
                nonce: "dapp-nonce",
                scope: "openid profile email",
                prompt: "login",
            });
            expect(auth0.searchParams.get("code_challenge")).not.toBe(s256(VERIFIER));
            expect(setCookie).toMatch(/^__Host-flow-[\w-]+=[\w-]+; Max-Age=600; Path=\/; Expires=.+; HttpOnly; Secure; SameSite=Lax$/);
        });

        it("should pass a signing payload on, without forcing the login screen", async () => {
            const { auth0 } = await startSignIn({ transaction: "1,2,3", audience: "auth0.jwt.fast-auth.testnet" });

            expect(auth0.searchParams.get("transaction")).toBe("1,2,3");
            expect(auth0.searchParams.get("audience")).toBe("auth0.jwt.fast-auth.testnet");
            expect(auth0.searchParams.has("prompt")).toBe(false);
        });

        it("should show a page, and send the user nowhere, for a redirect URI it may not use", async () => {
            const res = await request(server).get("/authorize").query({ client_id: "broker-client", redirect_uri: "http://evil.example" });

            expect(res.status).toBe(400);
            expect(res.headers.location).toBeUndefined();
            expect(res.text).toContain("redirect_uri must be an https URL");
        });

        it("should answer a hidden iframe's silent sign-in with login_required, framed by the dApp only", async () => {
            const res = await request(server)
                .get("/authorize")
                .query({
                    client_id: "broker-client",
                    redirect_uri: DAPP,
                    response_type: "code",
                    response_mode: "web_message",
                    prompt: "none",
                    state: "dapp-state",
                    code_challenge: s256(VERIFIER),
                    code_challenge_method: "S256",
                });

            expect(res.status).toBe(200);
            expect(res.text).toContain('"error":"login_required"');
            expect(res.headers["content-security-policy"]).toContain(`frame-ancestors ${DAPP}`);
        });
    });

    describe("callback", () => {
        it("should redeem Auth0's code with the broker's verifier and send the dApp a code of its own", async () => {
            const { auth0, cookie } = await startSignIn();
            const res = await callback(auth0, cookie);

            const [code, verifier, redirectUri] = exchangeCode.mock.calls[0];
            expect(code).toBe("auth0-code");
            expect(s256(verifier)).toBe(auth0.searchParams.get("code_challenge"));
            expect(redirectUri).toBe(`${BROKER}/callback`);

            expect(res.status).toBe(302);
            const back = new URL(res.headers.location);
            expect(back.origin + back.pathname).toBe(REDIRECT_URI);
            expect(back.searchParams.get("state")).toBe("dapp-state");
            expect(back.searchParams.get("code")).toMatch(/^[\w-]{43}$/);
            expect(res.headers["set-cookie"][0]).toMatch(/^__Host-flow-[\w-]+=;/);
        });

        it("should post the code to the popup's opener, at the dApp's origin only", async () => {
            const { auth0, cookie } = await startSignIn({ response_mode: "web_message", redirect_uri: DAPP });
            const res = await callback(auth0, cookie);

            expect(res.status).toBe(200);
            expect(res.text).toMatch(
                /postMessage\(\{ type: "authorization_response", response: \{"code":"[\w-]{43}","state":"dapp-state"\} \}, "https:\/\/my-dapp.example"\)/,
            );
            const nonce = /script-src 'nonce-([^']+)'/.exec(res.headers["content-security-policy"])![1];
            expect(res.text).toContain(`<script nonce="${nonce}">`);
        });

        it("should never let the dApp's state close the script", async () => {
            const { auth0, cookie } = await startSignIn({
                response_mode: "web_message",
                redirect_uri: DAPP,
                state: "</script><script>alert(1)",
            });
            const res = await callback(auth0, cookie);

            expect(res.text).not.toContain("</script><script>alert(1)");
            expect(res.text).toContain("\\u003c/script>\\u003cscript>alert(1)");
        });

        it("should refuse a callback from a browser that did not start the sign-in, and spend the sign-in", async () => {
            const { auth0, cookie } = await startSignIn();

            const stranger = await callback(auth0, undefined);
            expect(stranger.status).toBe(400);
            expect(stranger.text).toContain("This sign-in has expired");
            expect(exchangeCode).not.toHaveBeenCalled();

            expect((await callback(auth0, cookie)).status).toBe(400);
        });

        it("should refuse a callback for a sign-in it never started", async () => {
            const res = await request(server).get("/callback").query({ state: "made-up", code: "auth0-code" });

            expect(res.status).toBe(400);
        });

        it("should pass Auth0's error on to the dApp", async () => {
            const { auth0, cookie } = await startSignIn();
            const res = await callback(auth0, cookie, { error: "access_denied", error_description: "User rejected the signing request" });

            const back = new URL(res.headers.location);
            expect(Object.fromEntries(back.searchParams)).toEqual({
                error: "access_denied",
                error_description: "User rejected the signing request",
                state: "dapp-state",
            });
            expect(exchangeCode).not.toHaveBeenCalled();
        });

        it("should tell the dApp when Auth0 will not redeem its code", async () => {
            exchangeCode.mockRejectedValue(new Error("Auth0 answered 403 invalid_grant"));
            const { auth0, cookie } = await startSignIn();
            const res = await callback(auth0, cookie);

            expect(new URL(res.headers.location).searchParams.get("error")).toBe("server_error");
        });
    });

    describe("token", () => {
        it("should hand the dApp Auth0's tokens, readable from its page", async () => {
            const res = await redeem(await signIn());

            expect(res.status).toBe(200);
            expect(res.body).toEqual(TOKENS);
            expect(res.headers["access-control-allow-origin"]).toBe(DAPP);
            expect(res.headers["cache-control"]).toBe("no-store");
        });

        it("should take JSON too", async () => {
            const code = await signIn();
            const res = await request(server).post("/oauth/token").set("Origin", DAPP).send({
                client_id: "broker-client",
                grant_type: "authorization_code",
                code,
                code_verifier: VERIFIER,
                redirect_uri: REDIRECT_URI,
            });

            expect(res.status).toBe(200);
        });

        it("should let any page through the preflight", async () => {
            const res = await request(server).options("/oauth/token").set("Origin", "https://another.example");

            expect(res.status).toBe(204);
            expect(res.headers["access-control-allow-origin"]).toBe("https://another.example");
            expect(res.headers["access-control-allow-headers"]).toBe("Content-Type, Auth0-Client");
        });

        it("should redeem a code once", async () => {
            const code = await signIn();
            await redeem(code);
            const res = await redeem(code);

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("invalid_grant");
        });

        it.each([
            ["another origin", {}, "https://evil.example"],
            ["the wrong verifier", { code_verifier: "wrong-verifier-".padEnd(43, "x") }, DAPP],
            ["another redirect URI", { redirect_uri: `${DAPP}/other` }, DAPP],
        ])("should refuse a code redeemed from %s, and spend it", async (_, overrides, origin) => {
            const code = await signIn();
            const res = await redeem(code, overrides, origin);

            expect(res.status).toBe(400);
            expect(res.body.error).toBe("invalid_grant");
            expect((await redeem(code)).status).toBe(400);
        });

        it.each([
            ["another grant", { grant_type: "refresh_token" }, 400, "unsupported_grant_type"],
            ["another client", { client_id: "other" }, 401, "invalid_client"],
        ])("should refuse %s", async (_, overrides, status, error) => {
            const res = await redeem(await signIn(), overrides);

            expect(res.status).toBe(status);
            expect(res.body.error).toBe(error);
        });
    });

    describe("logout", () => {
        it("should sign the user out of Auth0 and send them back to the dApp", async () => {
            const res = await request(server).get("/v2/logout").query({ client_id: "broker-client", returnTo: DAPP });

            expect(res.status).toBe(302);
            const auth0 = new URL(res.headers.location);
            expect(auth0.origin + auth0.pathname).toBe("https://login.sandbox.example/v2/logout");
            expect(auth0.searchParams.get("returnTo")).toBe(`${BROKER}/logout/callback`);

            const cookie = res.headers["set-cookie"][0].split(";")[0];
            const back = await request(server).get("/logout/callback").set("Cookie", cookie);
            expect(back.status).toBe(302);
            expect(back.headers.location).toBe(DAPP);
        });

        it("should refuse a returnTo it may not send anyone to", async () => {
            const res = await request(server).get("/v2/logout").query({ client_id: "broker-client", returnTo: "http://evil.example" });

            expect(res.status).toBe(400);
        });

        it("should show a page when there is nowhere to return to", async () => {
            const res = await request(server).get("/logout/callback");

            expect(res.status).toBe(200);
            expect(res.text).toContain("You are signed out");
        });
    });

    it("should keep the popup's opener and forbid framing everywhere else", async () => {
        const res = await request(server).get("/livez");

        expect(res.status).toBe(200);
        expect(res.headers["cross-origin-opener-policy"]).toBeUndefined();
        expect(res.headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    });
});
