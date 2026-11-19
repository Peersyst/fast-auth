import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { createHash } from "crypto";
import request from "supertest";
import { AppModule } from "../src/app.module";

const DAPP = "https://my-dapp.example";
const VERIFIER = "dapp-verifier-".padEnd(43, "x");
const CHALLENGE = createHash("sha256").update(VERIFIER).digest("base64url");
const TOKENS = { access_token: "access-token", id_token: "id-token", token_type: "Bearer", expires_in: 60 };

describe("sandbox broker", () => {
    let app: INestApplication;
    const fetchMock = jest.spyOn(global, "fetch");

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
        app = moduleRef.createNestApplication({ logger: false });
        app.enableCors();
        await app.init();
    });

    afterAll(() => app.close());

    beforeEach(() => {
        fetchMock.mockReset().mockResolvedValue(new Response(JSON.stringify(TOKENS)));
    });

    /**
     * Starts a sign-in the way auth0-spa-js does.
     * @param params The authorize params to add or change.
     * @returns Auth0's authorize URL.
     */
    async function authorize(params: Record<string, string> = {}): Promise<URL> {
        const res = await request(app.getHttpServer())
            .get("/authorize")
            .query({
                client_id: "broker-client",
                redirect_uri: `${DAPP}/callback`,
                response_type: "code",
                state: "dapp-state",
                nonce: "dapp-nonce",
                scope: "openid profile email",
                code_challenge: CHALLENGE,
                code_challenge_method: "S256",
                ...params,
            });
        expect(res.status).toBe(302);
        return new URL(res.headers.location);
    }

    /**
     * Sends the user back from Auth0.
     * @param auth0 Auth0's authorize URL, whose state names the sign-in.
     * @param params Auth0's callback params.
     * @returns The response.
     */
    function callback(auth0: URL, params: Record<string, string> = { code: "auth0-code" }) {
        return request(app.getHttpServer())
            .get("/callback")
            .query({ state: auth0.searchParams.get("state"), ...params });
    }

    /**
     * Redeems a code the way auth0-spa-js does.
     * @param code The broker's code.
     * @param verifier The PKCE verifier.
     * @returns The response.
     */
    function token(code: string, verifier = VERIFIER) {
        return request(app.getHttpServer())
            .post("/oauth/token")
            .type("form")
            .send({
                client_id: "broker-client",
                grant_type: "authorization_code",
                code,
                code_verifier: verifier,
                redirect_uri: `${DAPP}/callback`,
            });
    }

    it("should sign a dApp in by redirect", async () => {
        const auth0 = await authorize();
        expect(auth0.origin + auth0.pathname).toBe("https://login.testnet.fast-auth.com/authorize");
        expect(Object.fromEntries(auth0.searchParams)).toEqual({
            client_id: "broker-client",
            response_type: "code",
            redirect_uri: "https://sandbox.auth.near.org/callback",
            state: expect.any(String),
            nonce: "dapp-nonce",
            scope: "openid profile email",
            prompt: "login",
        });

        const back = new URL((await callback(auth0)).headers.location);
        expect(back.origin + back.pathname).toBe(`${DAPP}/callback`);
        expect(back.searchParams.get("state")).toBe("dapp-state");
        expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual(
            expect.objectContaining({ code: "auth0-code", client_secret: "broker-secret" }),
        );

        const res = await token(back.searchParams.get("code")!);
        expect(res.status).toBe(200);
        expect(res.body).toEqual(TOKENS);
    });

    it("should pass a signing request on without forcing the login screen", async () => {
        const auth0 = await authorize({ transaction: "1,2,3", audience: "auth0.jwt.fast-auth.testnet" });

        expect(auth0.searchParams.get("transaction")).toBe("1,2,3");
        expect(auth0.searchParams.get("audience")).toBe("auth0.jwt.fast-auth.testnet");
        expect(auth0.searchParams.has("prompt")).toBe(false);
    });

    it("should post the code to a popup's opener, at the dApp's origin only", async () => {
        const auth0 = await authorize({ response_mode: "web_message", redirect_uri: DAPP, state: "</script>" });
        const res = await callback(auth0);

        expect(res.text).toMatch(/^<script>window\.opener\.postMessage\(.+, "https:\/\/my-dapp\.example"\);<\/script>$/);
        expect(res.text).toContain('"state":"\\u003c/script>"');
    });

    it("should pass Auth0's error on to the dApp", async () => {
        const res = await callback(await authorize(), { error: "access_denied", error_description: "User rejected" });

        expect(new URL(res.headers.location).searchParams.get("error")).toBe("access_denied");
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("should redeem a code once, and only with the dApp's PKCE verifier", async () => {
        const code = new URL((await callback(await authorize())).headers.location).searchParams.get("code")!;

        expect((await token(code, "wrong-verifier".padEnd(43, "x"))).status).toBe(400);
        expect((await token(code)).status).toBe(400);
    });

    it.each([
        ["an unknown client", { client_id: "other" }],
        ["a redirect URI that is no URL", { redirect_uri: "javascript:alert(1)" }],
    ])("should refuse %s", async (_, params) => {
        const res = await request(app.getHttpServer())
            .get("/authorize")
            .query({ client_id: "broker-client", redirect_uri: DAPP, state: "s", code_challenge: CHALLENGE, ...params });

        expect(res.status).toBe(400);
    });

    it("should refuse a sign-in it never started", async () => {
        expect((await request(app.getHttpServer()).get("/callback").query({ state: "made-up", code: "c" })).status).toBe(400);
    });

    it("should let any page call the token endpoint", async () => {
        const res = await request(app.getHttpServer())
            .options("/oauth/token")
            .set("Origin", DAPP)
            .set("Access-Control-Request-Method", "POST")
            .set("Access-Control-Request-Headers", "content-type,auth0-client");

        expect(res.headers["access-control-allow-origin"]).toBe("*");
        expect(res.headers["access-control-allow-headers"]).toBe("content-type,auth0-client");
    });

    it("should send the user back to the dApp on logout", async () => {
        const res = await request(app.getHttpServer()).get("/v2/logout").query({ client_id: "broker-client", returnTo: DAPP });

        expect(res.headers.location).toBe(DAPP);
    });
});
