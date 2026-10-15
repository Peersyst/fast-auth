import type * as Auth0 from "@auth0/auth0-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { apiError, mockApi, type MockRoutes } from "../test/api";
import { AuthProvider } from "./AuthProvider";
import { createQueryClient } from "./query-client";

vi.mock("@auth0/auth0-react", async (importOriginal) => ({
    ...(await importOriginal<typeof Auth0>()),
    Auth0Provider: ({ domain, clientId, children }: { domain: string; clientId: string; children: ReactNode }) => (
        <>
            <p>
                Auth0 {domain} {clientId}
            </p>
            {children}
        </>
    ),
}));

const CONFIG = { auth0Domain: "auth.example.com", auth0ClientId: "console-client" };

function renderProvider(routes: MockRoutes) {
    const api = mockApi(routes);
    render(
        <QueryClientProvider client={createQueryClient()}>
            <AuthProvider>
                <p>The console</p>
            </AuthProvider>
        </QueryClientProvider>,
    );
    return api;
}

describe("AuthProvider", () => {
    it("loads the config before mounting Auth0 with it", async () => {
        let answer: () => void = () => undefined;
        const gate = new Promise<void>((resolve) => (answer = resolve));
        const api = renderProvider({
            "GET /api/console/config": async () => {
                await gate;
                return { body: CONFIG };
            },
        });

        expect(screen.getByRole("status")).toHaveTextContent("Loading");
        expect(screen.queryByText("The console")).not.toBeInTheDocument();
        expect(screen.queryByText(/^Auth0 /)).not.toBeInTheDocument();
        answer();

        expect(await screen.findByText("Auth0 auth.example.com console-client")).toBeInTheDocument();
        expect(screen.getByText("The console")).toBeInTheDocument();
        expect(api.sent("GET /api/console/config")).toHaveLength(1);
    });

    it("explains a config that did not load and loads it again on Try again", async () => {
        const user = userEvent.setup();
        const routes: MockRoutes = { "GET /api/console/config": apiError(404, "NOT_FOUND") };
        const api = renderProvider(routes);

        expect(await screen.findByRole("alert")).toHaveTextContent("The console could not start");
        expect(screen.getByRole("alert")).toHaveTextContent("That page or record does not exist.");
        expect(screen.queryByText("The console")).not.toBeInTheDocument();
        routes["GET /api/console/config"] = { body: CONFIG };
        await user.click(screen.getByRole("button", { name: "Try again" }));

        expect(await screen.findByText("Auth0 auth.example.com console-client")).toBeInTheDocument();
        expect(screen.getByText("The console")).toBeInTheDocument();
        expect(api.sent("GET /api/console/config")).toHaveLength(2);
    });
});
