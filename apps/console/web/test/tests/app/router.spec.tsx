import { screen } from "@testing-library/react";
import { mockApi, renderApp } from "../../utils/api";
import { routes } from "../../../src/app/router";

const LIST = "GET /api/console/admin/dapps";

function renderAt(path: string, role: "user" | "admin") {
    const session = { email: `${role}@acme.xyz`, role, emailVerified: true };
    const api = mockApi({
        "GET /api/console/me": { body: session },
        [LIST]: { body: { items: [], total: 0, page: 1, pageSize: 20 } },
        "GET /api/console/admin/settings": { body: { autoApproval: { enabled: false, dailyCap: 10 } } },
    });
    renderApp(routes, path, session);
    return api;
}

describe("router", () => {
    it("should show an admin the dApps list at /admin/dapps", async () => {
        const api = renderAt("/admin/dapps", "admin");

        expect(await screen.findByRole("heading", { level: 1, name: "dApps" })).toBeInTheDocument();
        expect(api.sent(LIST)).toHaveLength(1);
    });

    it("should show a user /admin/dapps as not found, without asking for the list", async () => {
        const api = renderAt("/admin/dapps", "user");

        expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
        expect(api.sent(LIST)).toHaveLength(0);
    });

    it("should take an admin from /admin to the dApps list", async () => {
        renderAt("/admin", "admin");

        expect(await screen.findByRole("heading", { level: 1, name: "dApps" })).toBeInTheDocument();
    });
});
