import userEvent from "@testing-library/user-event";
import { render, screen, spyOnConsoleAuth, within } from "../../../../../utils";
import { AppHeader } from "../../../../../../src/modules/common/containers/app-header/app-header";

describe("AppHeader", () => {
    it("should show only the theme for a signed-out visitor", async () => {
        const auth = spyOnConsoleAuth();

        render(<AppHeader />);

        expect(await screen.findByText("Console")).toBeInTheDocument();
        expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Sign out" })).not.toBeInTheDocument();
        expect(auth.getMe).not.toHaveBeenCalled();
    });

    it("should link an owner to their dApp and the docs", async () => {
        const auth = spyOnConsoleAuth();
        auth.getSession.mockResolvedValue({ isAuthenticated: true, email: "owner@example.com" });

        render(<AppHeader />);

        const nav = await screen.findByRole("navigation", { name: "Main" });
        expect(within(nav).getByRole("link", { name: "My dApp" })).toHaveAttribute("href", "/");
        expect(within(nav).getByRole("link", { name: "Docs" })).toHaveAttribute("href", "https://docs.auth.near.org");
        expect(screen.getByText("owner@example.com")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "NEAR Auth console home" })).toHaveAttribute("href", "/");
    });

    it("should mark an admin and link to the dApps", async () => {
        const auth = spyOnConsoleAuth();
        auth.getSession.mockResolvedValue({ isAuthenticated: true, email: "admin@example.com" });
        auth.getMe.mockResolvedValue({ email: "admin@example.com", role: "admin", emailVerified: true });

        render(<AppHeader />);

        const nav = await screen.findByRole("navigation", { name: "Main" });
        expect(within(nav).getByRole("link", { name: "dApps" })).toHaveAttribute("href", "/admin/dapps");
        expect(screen.getByText("Admin")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "NEAR Auth console home" })).toHaveAttribute("href", "/admin/dapps");
    });

    it("should leave out the navigation until the email is verified", async () => {
        const auth = spyOnConsoleAuth();
        auth.getSession.mockResolvedValue({ isAuthenticated: true, email: "owner@example.com" });
        auth.getMe.mockResolvedValue({ email: "owner@example.com", role: "user", emailVerified: false });

        render(<AppHeader />);

        expect(await screen.findByRole("button", { name: "Sign out" })).toBeInTheDocument();
        expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    });

    it("should sign out", async () => {
        const user = userEvent.setup();
        const auth = spyOnConsoleAuth();
        auth.getSession.mockResolvedValue({ isAuthenticated: true, email: "owner@example.com" });
        render(<AppHeader />);

        await user.click(await screen.findByRole("button", { name: "Sign out" }));

        expect(auth.signOut).toHaveBeenCalledTimes(1);
    });
});
