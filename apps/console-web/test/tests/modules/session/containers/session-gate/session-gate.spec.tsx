import { Route, Routes } from "react-router";
import userEvent from "@testing-library/user-event";
import { DomainError } from "@frontend/core/domain/error";
import { ConsoleAuthErrors } from "@frontend/console-auth/domain/errors";
import { Role } from "@shared/console";
import { render, screen, spyOnConsoleAuth } from "../../../../../utils";
import { SessionGate } from "../../../../../../src/modules/session/containers/session-gate/session-gate";

const SIGNED_IN = { isAuthenticated: true, email: "owner@example.com" } as const;

/**
 * Renders the gate in front of a route at `/`.
 * @param role The role the route needs.
 * @returns The render result.
 */
function renderGate(role?: Role): ReturnType<typeof render> {
    return render(
        <Routes>
            <Route element={<SessionGate role={role} />}>
                <Route path="/" element={<p>Gated content</p>} />
            </Route>
        </Routes>,
        { route: "/?view=all" },
    );
}

describe("SessionGate", () => {
    it("should offer to sign in when signed out", async () => {
        spyOnConsoleAuth();

        renderGate();

        expect(await screen.findByRole("heading", { name: "Sign in to manage your dApp" })).toBeInTheDocument();
        expect(screen.queryByText("Gated content")).not.toBeInTheDocument();
    });

    it("should say sign-in did not finish when the popup failed", async () => {
        const user = userEvent.setup();
        const auth = spyOnConsoleAuth();
        auth.signIn.mockRejectedValueOnce(new DomainError(ConsoleAuthErrors.SIGN_IN_FAILED));
        renderGate();

        await user.click(await screen.findByRole("button", { name: "Sign in with NEAR Auth" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Sign-in did not finish");
    });

    it("should offer to continue in the tab, coming back to the same page, when the popup is blocked", async () => {
        const user = userEvent.setup();
        const auth = spyOnConsoleAuth();
        auth.signIn.mockRejectedValueOnce(new DomainError(ConsoleAuthErrors.POPUP_BLOCKED));
        renderGate();

        await user.click(await screen.findByRole("button", { name: "Sign in with NEAR Auth" }));
        await user.click(await screen.findByRole("button", { name: "Continue in this tab" }));

        expect(screen.getByText("Your browser blocked the sign-in window")).toBeInTheDocument();
        expect(auth.continueInTab).toHaveBeenCalledWith("/?view=all");
    });

    it("should render the route for a verified user", async () => {
        const auth = spyOnConsoleAuth();
        auth.getSession.mockResolvedValue(SIGNED_IN);

        renderGate();

        expect(await screen.findByText("Gated content")).toBeInTheDocument();
    });

    it("should say the session expired and sign out to sign in again", async () => {
        const user = userEvent.setup();
        const auth = spyOnConsoleAuth();
        auth.getSession.mockResolvedValue(SIGNED_IN);
        auth.getMe.mockRejectedValue(new DomainError(ConsoleAuthErrors.SESSION_EXPIRED));
        renderGate();

        await user.click(await screen.findByRole("button", { name: "Sign in again" }));

        expect(screen.getByRole("alert")).toHaveTextContent("Your session has expired");
        expect(auth.signOut).toHaveBeenCalledTimes(1);
    });

    it("should explain an account without an email", async () => {
        const auth = spyOnConsoleAuth();
        auth.getSession.mockResolvedValue(SIGNED_IN);
        auth.getMe.mockRejectedValue(new DomainError(ConsoleAuthErrors.EMAIL_REQUIRED));

        renderGate();

        expect(await screen.findByRole("heading", { name: "Your account has no email address" })).toBeInTheDocument();
    });

    it("should say the session could not be checked when the console is unreachable", async () => {
        const auth = spyOnConsoleAuth();
        auth.getSession.mockResolvedValue(SIGNED_IN);
        auth.getMe.mockRejectedValue(new DomainError(ConsoleAuthErrors.CONSOLE_UNREACHABLE));

        renderGate();

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Your session could not be checkedThe console could not be reached. Check your connection and try again.",
        );
    });

    it("should ask an unverified user to verify their email", async () => {
        const auth = spyOnConsoleAuth();
        auth.getSession.mockResolvedValue(SIGNED_IN);
        auth.getMe.mockResolvedValue({ email: "owner@example.com", role: "user", emailVerified: false });

        renderGate();

        expect(await screen.findByRole("heading", { name: "Verify your email" })).toBeInTheDocument();
        expect(screen.getByText("owner@example.com")).toBeInTheDocument();
    });

    it("should hide an admin route from a user", async () => {
        const auth = spyOnConsoleAuth();
        auth.getSession.mockResolvedValue(SIGNED_IN);

        renderGate("admin");

        expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
    });

    it("should render an admin route for an admin", async () => {
        const auth = spyOnConsoleAuth();
        auth.getSession.mockResolvedValue(SIGNED_IN);
        auth.getMe.mockResolvedValue({ email: "admin@example.com", role: "admin", emailVerified: true });

        renderGate("admin");

        expect(await screen.findByText("Gated content")).toBeInTheDocument();
    });
});
