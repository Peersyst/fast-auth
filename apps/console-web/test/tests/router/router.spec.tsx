import { Routes } from "../../../src/router/router";
import { mockApi, render, screen, spyOnConsoleAuth } from "../../utils";

describe("Routes", () => {
    it("should load the signed-in user once for the home page", async () => {
        const auth = spyOnConsoleAuth();
        auth.getSession.mockResolvedValue({ isAuthenticated: true, email: "owner@example.com" });
        mockApi({ "GET /api/console/dapp": { body: { items: [], totalItems: 0, currentPage: 1, pages: 0 } } });

        render(<Routes />, { route: "/" });

        expect(await screen.findByRole("heading", { name: "You haven't registered a dApp yet" })).toBeInTheDocument();
        expect(auth.getMe).toHaveBeenCalledTimes(1);
    });

    it("should send an admin from the home page to the dApps", async () => {
        const auth = spyOnConsoleAuth();
        auth.getSession.mockResolvedValue({ isAuthenticated: true, email: "admin@example.com" });
        auth.getMe.mockResolvedValue({ email: "admin@example.com", role: "admin", emailVerified: true });

        render(<Routes />, { route: "/" });

        expect(await screen.findByRole("heading", { name: "dApps" })).toBeInTheDocument();
        expect(auth.getMe).toHaveBeenCalledTimes(1);
    });
});
