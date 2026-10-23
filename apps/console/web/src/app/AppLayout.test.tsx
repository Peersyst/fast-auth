import { Auth0Context, initialContext, type Auth0ContextInterface } from "@auth0/auth0-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useSession } from "../features/auth/session";
import { mockApi, signedInAuth0, type MockRoutes } from "../test/api";
import { AppLayout } from "./AppLayout";
import { createQueryClient } from "./query-client";
import { RequireSession } from "./RequireSession";

const signedIn = signedInAuth0();

function PrivatePage() {
    return <p>Private page for {useSession().email}</p>;
}

describe("AppLayout", () => {
    it("forgets the previous user's session when Auth0 signs them out in the tab", async () => {
        const routes: MockRoutes = { "GET /api/console/me": { body: { email: "admin@acme.xyz", role: "admin", emailVerified: true } } };
        mockApi(routes);
        const router = createMemoryRouter(
            [
                {
                    element: <AppLayout />,
                    children: [{ element: <RequireSession />, children: [{ index: true, element: <PrivatePage /> }] }],
                },
            ],
            { initialEntries: ["/"] },
        );
        const queryClient = createQueryClient();
        const tree = (auth: Partial<Auth0ContextInterface>) => (
            <Auth0Context.Provider value={{ ...initialContext, isLoading: false, ...auth }}>
                <QueryClientProvider client={queryClient}>
                    <RouterProvider router={router} />
                </QueryClientProvider>
            </Auth0Context.Provider>
        );
        const { rerender } = render(tree(signedIn));
        expect(await screen.findByText("Private page for admin@acme.xyz")).toBeInTheDocument();

        rerender(tree({}));
        expect(screen.getByRole("button", { name: "Sign in with NEAR Auth" })).toBeInTheDocument();
        routes["GET /api/console/me"] = { body: { email: "user@acme.xyz", role: "user", emailVerified: true } };
        rerender(tree(signedIn));

        expect(document.body).not.toHaveTextContent("admin@acme.xyz");
        expect(await screen.findByText("Private page for user@acme.xyz")).toBeInTheDocument();
        expect(document.body).not.toHaveTextContent("admin@acme.xyz");
    });
});
