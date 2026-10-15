import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/client";
import { ownerDapp } from "../../test/api";
import { DappForm } from "./DappForm";

const PROPOSED = {
    name: "Acme Wallet 2",
    description: "A better wallet.",
    logoUrl: "https://cdn.acme.xyz/logo-2.png",
    callbackUrls: ["https://app.acme.xyz/callback", "https://app.acme.xyz/silent"],
    logoutUrls: [],
    webOrigins: ["https://app.acme.xyz"],
};

describe("DappForm", () => {
    it("explains every invalid field and does not save", async () => {
        const user = userEvent.setup();
        const onSave = vi.fn();
        render(<DappForm mode="owner" values={null} saveLabel="Submit for review" onSave={onSave} onCancel={vi.fn()} />);

        await user.type(screen.getByLabelText("Application name"), "Acme\u200BWallet");
        await user.type(screen.getByLabelText("Application logo"), "http://cdn.acme.xyz/logo.png");
        await user.type(screen.getByLabelText("Callback URL 1"), "https://printer.local/callback");
        await user.type(screen.getByLabelText("Web origin 1"), "https://app.acme.xyz/");
        await user.type(screen.getByLabelText("Primary contact email"), "dev@acme");
        await user.click(screen.getByRole("button", { name: "Submit for review" }));

        expect(screen.getByLabelText("Application name")).toHaveAccessibleDescription(
            expect.stringContaining(
                "Enter a name of at most 64 characters (most emoji count as two or more), with no < or > and no hidden or private-use characters.",
            ),
        );
        expect(screen.getByLabelText("Application logo")).toHaveAccessibleDescription(
            expect.stringContaining("Enter an https URL on a public host, of at most 255 characters."),
        );
        expect(screen.getByLabelText("Callback URL 1")).toHaveAccessibleDescription(
            "Enter an https URL on a public host, without a #fragment or credentials.",
        );
        expect(screen.getByLabelText("Web origin 1")).toHaveAccessibleDescription(
            "Enter an https origin on a public host, like https://app.example.com, with no path or trailing slash.",
        );
        expect(screen.getByLabelText("Primary contact email")).toHaveAccessibleDescription(
            expect.stringContaining("Enter a valid email address."),
        );
        expect(screen.getByLabelText("Expected monthly active users")).toHaveAccessibleDescription(
            expect.stringContaining("Choose how many monthly active users you expect."),
        );
        expect(onSave).not.toHaveBeenCalled();
    });

    it("focuses a new URL row, and a neighbour or the Add button after a removal", async () => {
        const user = userEvent.setup();
        render(<DappForm mode="owner" values={null} saveLabel="Submit for review" onSave={vi.fn()} onCancel={vi.fn()} />);
        const add = screen.getByRole("button", { name: "Add callback URL" });

        await user.click(add);
        expect(screen.getByLabelText("Callback URL 2")).toHaveFocus();
        await user.type(screen.getByLabelText("Callback URL 2"), "https://app.acme.xyz/second");
        await user.click(add);
        await user.type(screen.getByLabelText("Callback URL 3"), "https://app.acme.xyz/third");

        await user.click(screen.getByRole("button", { name: "Remove callback URL 2" }));
        expect(screen.getByLabelText("Callback URL 2")).toHaveFocus();
        expect(screen.getByLabelText("Callback URL 2")).toHaveValue("https://app.acme.xyz/third");

        await user.click(screen.getByRole("button", { name: "Remove callback URL 2" }));
        expect(screen.getByLabelText("Callback URL 1")).toHaveFocus();

        await user.click(screen.getByRole("button", { name: "Add logout URL" }));
        await user.click(screen.getByRole("button", { name: "Remove logout URL 1" }));
        expect(screen.getByRole("button", { name: "Add logout URL" })).toHaveFocus();
    });

    it("adds and removes URL rows, keeping at least one callback URL and at most ten", async () => {
        const user = userEvent.setup();
        render(<DappForm mode="owner" values={null} saveLabel="Submit for review" onSave={vi.fn()} onCancel={vi.fn()} />);
        const add = screen.getByRole("button", { name: "Add callback URL" });

        expect(screen.getByRole("button", { name: "Remove callback URL 1" })).toBeDisabled();
        await user.click(add);
        await user.type(screen.getByLabelText("Callback URL 2"), "https://app.acme.xyz/second");
        await user.click(screen.getByRole("button", { name: "Remove callback URL 1" }));
        expect(screen.getByLabelText("Callback URL 1")).toHaveValue("https://app.acme.xyz/second");
        expect(screen.queryByLabelText("Callback URL 2")).not.toBeInTheDocument();

        for (let rows = 1; rows < 10; rows++) await user.click(add);
        expect(screen.getByLabelText("Callback URL 10")).toBeInTheDocument();
        expect(add).toBeDisabled();

        expect(screen.queryByLabelText("Logout URL 1")).not.toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Add logout URL" }));
        expect(screen.getByRole("button", { name: "Remove logout URL 1" })).toBeEnabled();
    });

    it("saves the normalised fields", async () => {
        const user = userEvent.setup();
        const onSave = vi.fn(async () => {});
        render(<DappForm mode="owner" values={null} saveLabel="Submit for review" onSave={onSave} onCancel={vi.fn()} />);

        await user.type(screen.getByLabelText("Application name"), "  Acme Wallet ");
        await user.type(screen.getByLabelText("Application logo"), "https://CDN.acme.xyz/Logo.png");
        await user.type(screen.getByLabelText("Callback URL 1"), "https://APP.acme.xyz/callback");
        await user.click(screen.getByRole("button", { name: "Add callback URL" }));
        await user.type(screen.getByLabelText("Callback URL 2"), "https://app.acme.xyz/callback");
        await user.type(screen.getByLabelText("Web origin 1"), "https://app.acme.xyz");
        await user.type(screen.getByLabelText("Primary contact email"), "dev@acme.xyz");
        await user.selectOptions(screen.getByLabelText("Expected monthly active users"), "Less than 1,000");
        await user.click(screen.getByRole("button", { name: "Submit for review" }));

        expect(onSave).toHaveBeenCalledWith({
            name: "Acme Wallet",
            description: "",
            logoUrl: "https://cdn.acme.xyz/Logo.png",
            mauBracket: "lt1k",
            callbackUrls: ["https://app.acme.xyz/callback"],
            logoutUrls: [],
            webOrigins: ["https://app.acme.xyz"],
            contactEmail: "dev@acme.xyz",
        });
    });

    it("shows an approved dApp's pending change and marks the fields that wait for review", () => {
        const dapp = ownerDapp({ status: "approved", auth0ClientId: "client-1", pendingChange: PROPOSED });
        render(<DappForm mode="owner" values={dapp} saveLabel="Save changes" onSave={vi.fn()} onCancel={vi.fn()} />);

        expect(screen.getByLabelText("Application name")).toHaveValue("Acme Wallet 2");
        expect(screen.getByLabelText("Callback URL 2")).toHaveValue("https://app.acme.xyz/silent");
        for (const field of ["Application name", "Application description", "Application logo"]) {
            expect(screen.getByLabelText(field)).toHaveAccessibleDescription(expect.stringMatching(/^Changes wait for review\./));
        }
        for (const list of ["Callback URLs", "Logout URLs", "Web origins"]) {
            expect(screen.getByRole("group", { name: list })).toHaveAccessibleDescription(
                expect.stringMatching(/^Changes wait for review\./),
            );
        }
        expect(screen.getByLabelText("Primary contact email")).not.toHaveAccessibleDescription(expect.stringContaining("review"));
        expect(screen.getByLabelText("Expected monthly active users")).not.toHaveAccessibleDescription(expect.stringContaining("review"));
    });

    it("does not mark fields for review on a pending dApp or for an admin", () => {
        const { unmount } = render(
            <DappForm mode="owner" values={ownerDapp()} saveLabel="Save changes" onSave={vi.fn()} onCancel={vi.fn()} />,
        );
        expect(screen.getByLabelText("Application name")).not.toHaveAccessibleDescription(expect.stringContaining("review"));
        unmount();

        const approved = ownerDapp({ status: "approved", auth0ClientId: "client-1" });
        render(<DappForm mode="admin" values={approved} saveLabel="Save changes" onSave={vi.fn()} onCancel={vi.fn()} />);
        expect(screen.getByLabelText("Application name")).toHaveValue("Acme Wallet");
        expect(screen.getByLabelText("Application name")).not.toHaveAccessibleDescription(expect.stringContaining("review"));
        expect(
            screen.getByText(
                "Changes to the name, description, logo or URLs update its Auth0 client at once. The owner is emailed about any change.",
            ),
        ).toBeInTheDocument();
    });

    it("explains the server's field errors and focuses the first refused field", async () => {
        const user = userEvent.setup();
        const onSave = vi.fn(async () => {
            throw new ApiError({
                statusCode: 400,
                code: "VALIDATION_FAILED",
                message: "Invalid",
                details: [
                    { field: "callbackUrls", constraint: "isUrlList" },
                    { field: "name", constraint: "isDappName" },
                ],
            });
        });
        render(<DappForm mode="owner" values={ownerDapp()} saveLabel="Save changes" onSave={onSave} onCancel={vi.fn()} />);

        await user.click(screen.getByRole("button", { name: "Save changes" }));

        const name = screen.getByLabelText("Application name");
        const nameReason =
            "Enter a name of at most 64 characters (most emoji count as two or more), with no < or > and no hidden or private-use characters.";
        const listReason = "Add 1 to 10 callback URLs, each an https URL on a public host, without a #fragment or credentials.";
        expect(name).toHaveFocus();
        expect(name).toHaveAccessibleDescription(expect.stringContaining(nameReason));
        expect(screen.getByRole("group", { name: "Callback URLs" })).toHaveAccessibleDescription(expect.stringContaining(listReason));
        expect(screen.getByLabelText("Callback URL 1")).toBeInvalid();
        expect(screen.getAllByRole("alert").map((alert) => alert.textContent)).toEqual([nameReason, listReason]);

        await user.type(screen.getByLabelText("Callback URL 1"), "/v2");

        expect(screen.getByRole("group", { name: "Callback URLs" })).not.toHaveAccessibleDescription(expect.stringContaining(listReason));
        expect(screen.getByLabelText("Callback URL 1")).toBeValid();
        expect(screen.getAllByRole("alert").map((alert) => alert.textContent)).toEqual([nameReason]);
    });

    it("focuses the first row of a refused URL list", async () => {
        const user = userEvent.setup();
        const onSave = vi.fn(async () => {
            throw new ApiError({
                statusCode: 400,
                code: "VALIDATION_FAILED",
                message: "Invalid",
                details: [{ field: "webOrigins", constraint: "isUrlList" }],
            });
        });
        render(<DappForm mode="owner" values={ownerDapp()} saveLabel="Save changes" onSave={onSave} onCancel={vi.fn()} />);

        await user.click(screen.getByRole("button", { name: "Save changes" }));

        expect(screen.getByLabelText("Web origin 1")).toHaveFocus();
        expect(screen.getByRole("alert")).toHaveTextContent(
            "Add 1 to 10 web origins, each an https origin on a public host, like https://app.example.com, with no path or trailing slash.",
        );
    });

    it("shows other errors in a callout, with Reload when the dApp changed", async () => {
        const user = userEvent.setup();
        const onReload = vi.fn();
        const onSave = vi.fn(async () => {
            throw new ApiError({ statusCode: 409, code: "DAPP_CHANGED", message: "Changed" });
        });
        render(
            <DappForm mode="owner" values={ownerDapp()} saveLabel="Save changes" onSave={onSave} onCancel={vi.fn()} onReload={onReload} />,
        );

        await user.click(screen.getByRole("button", { name: "Save changes" }));
        const alert = screen.getByRole("alert");
        expect(alert).toHaveTextContent("This dApp changed since you opened it.");
        await user.click(within(alert).getByRole("button", { name: "Reload" }));

        expect(onReload).toHaveBeenCalledOnce();
    });
});
