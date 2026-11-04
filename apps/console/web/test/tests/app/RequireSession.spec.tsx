import { Auth0Context, initialContext, PopupCancelledError, PopupOpenError, type Auth0ContextInterface } from "@auth0/auth0-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { useMe, useMyDapp } from "../../../src/api/hooks";
import { useSession } from "../../../src/features/auth/session";
import { apiError, mockApi, refocus, signedInAuth0, type MockRoutes } from "../../utils/api";
import { createQueryClient } from "../../../src/app/query-client";
import { RequireSession } from "../../../src/app/RequireSession";

const loginWithPopup = jest.fn();
const loginWithRedirect = jest.fn();
const logout = jest.fn();
const getAccessTokenSilently = jest.fn(async () => "access-token");
const signedIn = signedInAuth0(getAccessTokenSilently);

function PrivatePage() {
    return <p>Private page for {useSession().email}</p>;
}

function SessionPage() {
    const { email } = useSession();
    const me = useMe(true);
    return <p>{me.isError ? `Refresh failed; still signed in as ${email}` : `Signed in as ${email}`}</p>;
}

function DappPage() {
    const dapp = useMyDapp();
    return <p>{dapp.isError ? "dApp failed" : "Loading dApp"}</p>;
}

function renderAt(state: Partial<Auth0ContextInterface>, path = "/admin/dapps/42?tab=activity") {
    const router = createMemoryRouter(
        [
            {
                element: <RequireSession />,
                children: [
                    { index: true, element: <PrivatePage /> },
                    { path: "dapp", element: <DappPage /> },
                    { path: "session", element: <SessionPage /> },
                ],
            },
            { path: "admin", element: <RequireSession role="admin" />, children: [{ path: "dapps/:id", element: <PrivatePage /> }] },
        ],
        { initialEntries: [path] },
    );
    const queryClient = createQueryClient();
    const tree = (next: Partial<Auth0ContextInterface>) => (
        <Auth0Context.Provider value={{ ...initialContext, isLoading: false, loginWithPopup, loginWithRedirect, logout, ...next }}>
            <QueryClientProvider client={queryClient}>
                <RouterProvider router={router} />
            </QueryClientProvider>
        </Auth0Context.Provider>
    );
    const result = render(tree(state));
    return { setAuth: (next: Partial<Auth0ContextInterface>) => result.rerender(tree(next)) };
}

function mockMe(role: "user" | "admin", routes: MockRoutes = {}) {
    return mockApi({ "GET /api/console/me": { body: { email: `${role}@acme.xyz`, role, emailVerified: true } }, ...routes });
}

describe("RequireSession", () => {
    beforeEach(() => jest.clearAllMocks());

    it("should show a loading state while Auth0 checks the session", () => {
        renderAt({ isLoading: true });

        expect(screen.getByRole("status")).toHaveTextContent("Loading");
    });

    it("should render the page for a verified user and provide the session", async () => {
        const api = mockMe("user");
        renderAt(signedIn, "/");

        expect(await screen.findByText("Private page for user@acme.xyz")).toBeInTheDocument();
        expect(api.sent("GET /api/console/me")).toHaveLength(1);
    });

    it("should keep the page when a background refetch of the session fails", async () => {
        const routes: MockRoutes = { "GET /api/console/me": { body: { email: "user@acme.xyz", role: "user", emailVerified: true } } };
        mockApi(routes);
        renderAt(signedIn, "/session");
        await screen.findByText("Signed in as user@acme.xyz");

        routes["GET /api/console/me"] = apiError(429, "RATE_LIMITED");
        refocus();

        expect(await screen.findByText("Refresh failed; still signed in as user@acme.xyz")).toBeInTheDocument();
        expect(screen.queryByText("Your session could not be checked")).not.toBeInTheDocument();
    });

    it("should show the expired-session screen when a background refetch of the session answers 401", async () => {
        const routes: MockRoutes = { "GET /api/console/me": { body: { email: "user@acme.xyz", role: "user", emailVerified: true } } };
        mockApi(routes);
        renderAt(signedIn, "/session");
        await screen.findByText("Signed in as user@acme.xyz");

        routes["GET /api/console/me"] = apiError(401, "UNAUTHENTICATED");
        refocus();

        expect(await screen.findByRole("alert")).toHaveTextContent("Your session has expired");
        expect(screen.getByRole("button", { name: "Sign in again" })).toBeInTheDocument();
        expect(screen.queryByText(/signed in as user@acme.xyz/i)).not.toBeInTheDocument();
    });

    it("should show the missing-email notice when the token has no email", async () => {
        mockApi({ "GET /api/console/me": apiError(403, "EMAIL_REQUIRED") });
        renderAt(signedIn, "/");

        expect(await screen.findByRole("heading", { name: "Your account has no email address" })).toBeInTheDocument();
    });

    it("should ask to sign in again, without a retry, when the API rejects the renewed token", async () => {
        const user = userEvent.setup();
        mockApi({ "GET /api/console/me": apiError(401, "UNAUTHENTICATED") });
        renderAt(signedIn, "/");

        await user.click(await screen.findByRole("button", { name: "Sign in again" }));

        expect(screen.getByRole("alert")).toHaveTextContent("Your session has expired");
        expect(screen.queryByRole("button", { name: "Try again" })).not.toBeInTheDocument();
        expect(logout).toHaveBeenCalledWith({ logoutParams: { returnTo: window.location.origin } });
    });

    it("should offer a retry when the session check fails for another reason", async () => {
        mockApi({ "GET /api/console/me": apiError(429, "RATE_LIMITED") });
        renderAt(signedIn, "/");

        expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Sign in again" })).not.toBeInTheDocument();
    });

    it("should show the verify-email screen until the refreshed token is verified", async () => {
        const user = userEvent.setup();
        const routes: MockRoutes = { "GET /api/console/me": { body: { email: "dev@acme.xyz", role: "user", emailVerified: false } } };
        mockApi(routes);
        renderAt(signedIn, "/");

        expect(await screen.findByRole("heading", { name: "Verify your email" })).toBeInTheDocument();
        routes["GET /api/console/me"] = { body: { email: "dev@acme.xyz", role: "user", emailVerified: true } };
        await user.click(screen.getByRole("button", { name: "I've verified my email" }));

        expect(await screen.findByText("Private page for dev@acme.xyz")).toBeInTheDocument();
        expect(getAccessTokenSilently).toHaveBeenCalledWith({ cacheMode: "off" });
    });

    it("should say the email is still not verified when the refreshed token has not changed", async () => {
        const user = userEvent.setup();
        mockApi({ "GET /api/console/me": { body: { email: "dev@acme.xyz", role: "user", emailVerified: false } } });
        renderAt(signedIn, "/");

        await user.click(await screen.findByRole("button", { name: "I've verified my email" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Your email is not verified yet");
        expect(screen.getByRole("heading", { name: "Verify your email" })).toBeInTheDocument();
    });

    it("should say the session could not be refreshed when the recheck of the session fails", async () => {
        const user = userEvent.setup();
        const routes: MockRoutes = { "GET /api/console/me": { body: { email: "dev@acme.xyz", role: "user", emailVerified: false } } };
        mockApi(routes);
        renderAt(signedIn, "/");
        await screen.findByRole("heading", { name: "Verify your email" });

        routes["GET /api/console/me"] = apiError(429, "RATE_LIMITED");
        await user.click(screen.getByRole("button", { name: "I've verified my email" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("We could not refresh your session");
        expect(screen.queryByText("Your email is not verified yet")).not.toBeInTheDocument();
    });

    it("should land on the verify-email screen when any call answers EMAIL_NOT_VERIFIED", async () => {
        mockMe("user", { "GET /api/console/dapp": apiError(403, "EMAIL_NOT_VERIFIED") });
        renderAt(signedIn, "/dapp");

        expect(await screen.findByRole("heading", { name: "Verify your email" })).toBeInTheDocument();
    });

    it("should show a user an admin page as not found, without mentioning admins", async () => {
        mockMe("user");
        renderAt(signedIn);

        expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
        expect(screen.queryByText(/admin/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Private page/)).not.toBeInTheDocument();
    });

    it("should render an admin page for an admin", async () => {
        mockMe("admin");
        renderAt(signedIn);

        expect(await screen.findByText("Private page for admin@acme.xyz")).toBeInTheDocument();
    });

    it("should sign in with a popup and show the signing-in screen meanwhile", async () => {
        const user = userEvent.setup();
        const { setAuth } = renderAt({});

        await user.click(screen.getByRole("button", { name: "Sign in with NEAR Auth" }));
        setAuth({ isLoading: true });

        expect(loginWithPopup).toHaveBeenCalledTimes(1);
        expect(loginWithPopup).toHaveBeenCalledWith(undefined, { timeoutInSeconds: 600 });
        expect(screen.getByRole("heading", { name: "Signing you in" })).toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent("Complete sign-in in the NEAR Auth window.");
    });

    it("should offer the redirect flow when the popup is blocked, returning to the same page", async () => {
        const user = userEvent.setup();
        const { setAuth } = renderAt({});

        await user.click(screen.getByRole("button", { name: "Sign in with NEAR Auth" }));
        setAuth({ error: new PopupOpenError() });
        await user.click(screen.getByRole("button", { name: "Continue in this tab" }));

        expect(loginWithRedirect).toHaveBeenCalledWith({ appState: { returnTo: "/admin/dapps/42?tab=activity" } });
    });

    it("should tell a blocked popup to the user and move focus to Continue in this tab", async () => {
        const user = userEvent.setup();
        const { setAuth } = renderAt({});

        await user.click(screen.getByRole("button", { name: "Sign in with NEAR Auth" }));
        setAuth({ error: new PopupOpenError() });

        const continueInTab = screen.getByRole("button", { name: "Continue in this tab" });
        expect(continueInTab).toHaveFocus();
        expect(continueInTab).toHaveAccessibleDescription(
            "Your browser blocked the sign-in window Continue in this tab instead; you will come back here once you have signed in.",
        );
    });

    it("should go back to the sign-in screen with an error when the popup is closed", async () => {
        const user = userEvent.setup();
        const { setAuth } = renderAt({});

        await user.click(screen.getByRole("button", { name: "Sign in with NEAR Auth" }));
        setAuth({ error: new PopupCancelledError(window) });

        expect(screen.getByRole("alert")).toHaveTextContent("Sign-in did not finish");
        expect(screen.getByRole("button", { name: "Sign in with NEAR Auth" })).toBeInTheDocument();
    });
});
