import { type Auth0ContextInterface, type IdToken } from "@auth0/auth0-react";
import { focusManager } from "@tanstack/react-query";
import { act } from "@testing-library/react";
import { vi } from "vitest";
import type { ErrorCode, ErrorDetail, OwnerDapp } from "../api/client";
import type { paths } from "../api/schema.gen";

type MockAnswer = { status?: number; body?: unknown };

export type SentRequest = { method: string; path: string; query: URLSearchParams; body: unknown };

type Method = "get" | "put" | "post" | "delete";

type ConcretePath<P extends string> = P extends `${infer Head}{${string}}${infer Tail}` ? `${Head}${string}${ConcretePath<Tail>}` : P;

type Route = {
    [P in keyof paths]: {
        [M in Method]: paths[P][M] extends { responses: unknown } ? `${Uppercase<M>} ${ConcretePath<P>}` : never;
    }[Method];
}[keyof paths];

type Handler = MockAnswer | ((request: SentRequest) => MockAnswer | Promise<MockAnswer>);

export type MockRoutes = { [R in Route]?: Handler };

export function mockApi(mocked: MockRoutes) {
    const routes: Partial<Record<string, Handler>> = mocked;
    const requests: SentRequest[] = [];
    vi.stubGlobal(
        "fetch",
        vi.fn(async (request: Request) => {
            const url = new URL(request.url);
            const text = await request.text();
            const sent = { method: request.method, path: url.pathname, query: url.searchParams, body: text ? JSON.parse(text) : undefined };
            requests.push(sent);
            const route = routes[`${sent.method} ${sent.path}`];
            const answer = typeof route === "function" ? await route(sent) : route;
            const { status, body } = answer ?? { status: 404, body: { statusCode: 404, code: "NOT_FOUND", message: "No mock" } };
            return new Response(body === undefined ? null : JSON.stringify(body), {
                status: status ?? 200,
                headers: { "Content-Type": "application/json" },
            });
        }),
    );
    return { sent: (route: Route) => requests.filter((request) => `${request.method} ${request.path}` === route) };
}

export function apiError(statusCode: number, code: ErrorCode, details?: ErrorDetail[]): MockAnswer {
    return { status: statusCode, body: { statusCode, code, message: code, details } };
}

export function refocus() {
    act(() => {
        focusManager.setFocused(false);
        focusManager.setFocused(true);
    });
}

export function signedInAuth0(getAccessTokenSilently = vi.fn(async () => "access-token")): Partial<Auth0ContextInterface> {
    return {
        isAuthenticated: true,
        getIdTokenClaims: async () => ({ __raw: "id-token", exp: Math.floor(Date.now() / 1000) + 3600 }) as IdToken,
        getAccessTokenSilently: getAccessTokenSilently as unknown as Auth0ContextInterface["getAccessTokenSilently"],
    };
}

const DAPP_FIELDS = {
    name: "Acme Wallet",
    description: "A wallet for NEAR.",
    logoUrl: "https://cdn.acme.xyz/logo.png",
    mauBracket: "1k_10k",
    callbackUrls: ["https://app.acme.xyz/callback"],
    logoutUrls: [],
    webOrigins: ["https://app.acme.xyz"],
    contactEmail: "dev@acme.xyz",
} satisfies Partial<OwnerDapp>;

export function ownerDapp(overrides: Partial<OwnerDapp> = {}): OwnerDapp {
    return {
        ...DAPP_FIELDS,
        id: "0d9f3b8e-1c5e-4a40-9c0e-6a6f7f0b5a11",
        status: "pending",
        rejectionReason: null,
        pendingChange: null,
        pendingChangeAt: null,
        auth0ClientId: null,
        version: 3,
        submittedAt: "2026-10-01T10:00:00.000Z",
        ...overrides,
    };
}
