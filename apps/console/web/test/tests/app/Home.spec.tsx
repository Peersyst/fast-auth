import { screen } from "@testing-library/react";
import { mockApi, renderApp } from "../../utils/api";
import { Home } from "../../../src/app/Home";

const ROUTES = [
    { path: "/", element: <Home /> },
    { path: "/admin/dapps", element: <h1>All dApps</h1> },
];

describe("Home", () => {
    it("should send an admin to the dApps list", async () => {
        mockApi({});
        renderApp(ROUTES, "/", { email: "admin@acme.xyz", role: "admin", emailVerified: true });

        expect(await screen.findByRole("heading", { name: "All dApps" })).toBeInTheDocument();
    });

    it("should show an owner their own dApp page", async () => {
        mockApi({ "GET /api/console/dapp": { body: { dapp: null } } });
        renderApp(ROUTES, "/");

        expect(await screen.findByRole("heading", { name: "You haven't registered a dApp yet" })).toBeInTheDocument();
        expect(screen.queryByRole("heading", { name: "All dApps" })).not.toBeInTheDocument();
    });
});
