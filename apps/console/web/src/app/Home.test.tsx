import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { mockApi, renderApp } from "../test/api";
import { Home } from "./Home";

const ROUTES = [
    { path: "/", element: <Home /> },
    { path: "/admin/dapps", element: <h1>All dApps</h1> },
];

describe("Home", () => {
    it("sends an admin to the dApps list", async () => {
        mockApi({});
        renderApp(ROUTES, "/", { email: "admin@acme.xyz", role: "admin", emailVerified: true });

        expect(await screen.findByRole("heading", { name: "All dApps" })).toBeInTheDocument();
    });

    it("shows an owner their own dApp page", async () => {
        mockApi({ "GET /api/console/dapp": { body: { dapp: null } } });
        renderApp(ROUTES, "/");

        expect(await screen.findByRole("heading", { name: "You haven't registered a dApp yet" })).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "All dApps" })).not.toBeInTheDocument();
    });
});
