import userEvent from "@testing-library/user-event";
import { DomainError } from "@frontend/core/domain/error";
import { ConsoleAuthErrors } from "@frontend/console-auth/domain/errors";
import { render, screen, spyOnConsoleAuth } from "../../../../../utils";
import { VerifyEmail } from "../../../../../../src/modules/session/containers/verify-email/verify-email";

describe("VerifyEmail", () => {
    it("should say the email is not verified yet when the renewed session still says so", async () => {
        const user = userEvent.setup();
        const auth = spyOnConsoleAuth();
        auth.getMe.mockResolvedValue({ email: "owner@example.com", role: "user", emailVerified: false });
        render(<VerifyEmail email="owner@example.com" />);

        await user.click(screen.getByRole("button", { name: "I've verified my email" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Your email is not verified yet");
        expect(auth.refreshSession).toHaveBeenCalledTimes(1);
    });

    it("should say the session could not be refreshed", async () => {
        const user = userEvent.setup();
        const auth = spyOnConsoleAuth();
        auth.refreshSession.mockRejectedValueOnce(new DomainError(ConsoleAuthErrors.SESSION_RENEWAL_FAILED));
        render(<VerifyEmail email="owner@example.com" />);

        await user.click(screen.getByRole("button", { name: "I've verified my email" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("We could not refresh your session");
    });

    it("should link to support", () => {
        spyOnConsoleAuth();

        render(<VerifyEmail email="owner@example.com" />);

        expect(screen.getByRole("link", { name: "Contact the NEAR Auth team" })).toHaveAttribute("href", "https://discord.gg/JZfwEt82ur");
    });
});
