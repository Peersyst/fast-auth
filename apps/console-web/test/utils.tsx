import { PropsWithChildren, ReactElement } from "react";
import { act, render, RenderResult } from "@testing-library/react";
import { createMemoryRouter, MemoryRouter, Outlet, RouteObject, RouterProvider } from "react-router";
import { focusManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfigManagerProvider } from "@frontend/config/react";
import { getInstance } from "@frontend/core/common/utils/singleton";
import { ConsoleAuthController } from "@frontend/console-auth/domain/controllers";
import { Config } from "@frontend/config";
import { MeDto } from "@shared/console";
import { deepmerge, getAttribute } from "@shared/utils";
import staticConfig from "../src/config/static";
import { configManager } from "../src/config";
import { DSProvider } from "../src/design-system/ds.provider";
import { createQueryClient } from "../src/query/query-client.provider";
import { ErrorHandler } from "../src/modules/common/components/feedback/error-handler/error-handler";

export type RenderConfig = {
    route?: string;
};

/**
 * Creates the app's query client without retries, so a failed request answers at once.
 * @returns The query client.
 */
function createTestQueryClient(): QueryClient {
    const queryClient = createQueryClient();
    queryClient.setDefaultOptions({ queries: { retry: false } });
    return queryClient;
}

/**
 * Wraps a tree in the app's providers.
 * @param queryClient The query client.
 * @returns The wrapper.
 */
function providers(queryClient: QueryClient): (props: PropsWithChildren) => React.JSX.Element {
    return function Providers({ children }: PropsWithChildren): React.JSX.Element {
        return (
            <ConfigManagerProvider value={configManager}>
                <DSProvider>
                    <QueryClientProvider client={queryClient}>
                        <ErrorHandler>{children}</ErrorHandler>
                    </QueryClientProvider>
                </DSProvider>
            </ConfigManagerProvider>
        );
    };
}

/**
 * Renders a tree inside the app's providers and a router at the given route.
 * @param ui The tree.
 * @param config The route to start at.
 * @returns The render result.
 */
function customRender(ui: ReactElement, { route = "/" }: RenderConfig = {}): RenderResult {
    const Providers = providers(createTestQueryClient());

    function Wrapper({ children }: PropsWithChildren): React.JSX.Element {
        return (
            <Providers>
                <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
            </Providers>
        );
    }

    return render(ui, { wrapper: Wrapper });
}

export const OWNER: MeDto = { email: "owner@acme.xyz", role: "user", emailVerified: true };

/**
 * Renders routes inside the app's providers, below the signed-in user `SessionGate` hands its routes.
 * @param routes The routes.
 * @param path The path to start at.
 * @param me The signed-in user.
 * @returns The router, to navigate and read the location.
 */
export function renderRoutes(routes: RouteObject[], path: string, me: MeDto = OWNER): ReturnType<typeof createMemoryRouter> {
    const router = createMemoryRouter([{ element: <Outlet context={me} />, children: routes }], { initialEntries: [path] });
    const Providers = providers(createTestQueryClient());
    render(
        <Providers>
            <RouterProvider router={router} />
        </Providers>,
    );
    return router;
}

export type SentRequest = { method: string; path: string; query: URLSearchParams; body: unknown; authorization: string | null };

type MockAnswer = { status?: number; body?: unknown };

type MockHandler = MockAnswer | ((request: SentRequest) => MockAnswer | Promise<MockAnswer>);

/**
 * The console's answers by `"<METHOD> <path>"`.
 */
export type MockRoutes = Record<string, MockHandler>;

/**
 * Answers the generated client's requests from the given routes. A route not given answers 404.
 * Each route is read when its request arrives, so a test can change an answer midway.
 * @param routes The answers.
 * @returns The requests sent to a route.
 */
export function mockApi(routes: MockRoutes): { sent: (route: string) => SentRequest[] } {
    const requests: SentRequest[] = [];
    const auth = getInstance(ConsoleAuthController);
    if (!jest.isMockFunction(auth.getIdToken)) jest.spyOn(auth, "getIdToken").mockResolvedValue("id-token");
    jest.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
        const url = new URL(String(input), "http://localhost");
        const text = typeof init?.body === "string" ? init.body : "";
        const sent: SentRequest = {
            method: init?.method ?? "GET",
            path: url.pathname,
            query: url.searchParams,
            body: text ? JSON.parse(text) : undefined,
            authorization: new Headers(init?.headers).get("Authorization"),
        };
        requests.push(sent);
        const route = routes[`${sent.method} ${sent.path}`];
        const answer = typeof route === "function" ? await route(sent) : route;
        const { status = 200, body } = answer ?? { status: 404, body: { statusCode: 404, message: "Not Found" } };
        return new Response(body === undefined ? null : JSON.stringify(body), {
            status,
            headers: body === undefined ? {} : { "Content-Type": "application/json" },
        });
    });
    return { sent: (route) => requests.filter((request) => `${request.method} ${request.path}` === route) };
}

/**
 * The console's answer for a business error.
 * @param statusCode The HTTP status.
 * @param code The error code.
 * @returns The answer.
 */
export function apiError(statusCode: number, code: string): MockAnswer {
    return { status: statusCode, body: { statusCode, message: code } };
}

/**
 * Overrides the config the app reads, as `/config.json` would.
 * @param overrides The values to change.
 */
export function mockConfig(overrides: Partial<Config>): void {
    const config: Config = deepmerge(staticConfig, overrides);
    jest.spyOn(configManager, "getAll").mockReturnValue(config);
    jest.spyOn(configManager, "get").mockImplementation((key) => getAttribute(config, key));
}

/**
 * Brings the window back into focus, so the queries on screen refetch.
 */
export function refocus(): void {
    act(() => {
        focusManager.setFocused(false);
        focusManager.setFocused(true);
    });
}

/**
 * Spies on the console auth controller the app's hooks call.
 * @returns The controller's spied methods.
 */
export function spyOnConsoleAuth(): Record<
    "getSession" | "getMe" | "signIn" | "continueInTab" | "signOut" | "refreshSession",
    jest.SpyInstance
> {
    const controller = getInstance(ConsoleAuthController);
    return {
        getSession: jest.spyOn(controller, "getSession").mockResolvedValue({ isAuthenticated: false }),
        getMe: jest.spyOn(controller, "getMe").mockResolvedValue({ email: "owner@example.com", role: "user", emailVerified: true }),
        signIn: jest.spyOn(controller, "signIn").mockResolvedValue(),
        continueInTab: jest.spyOn(controller, "continueInTab").mockResolvedValue(),
        signOut: jest.spyOn(controller, "signOut").mockResolvedValue(),
        refreshSession: jest.spyOn(controller, "refreshSession").mockResolvedValue(),
    };
}

export * from "@testing-library/react";
export { customRender as render };
