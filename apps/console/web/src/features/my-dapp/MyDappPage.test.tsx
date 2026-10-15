import { screen, waitFor, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ClientConfig } from "../../api/client";
import { apiError, CLIENT_CONFIG, DAPP_ID, mockApi, ownerDapp, refocus, renderApp, type MockRoutes } from "../../test/api";
import { MyDappPage } from "./MyDappPage";

function renderPage(routes: MockRoutes, config?: ClientConfig) {
    const api = mockApi(routes);
    renderApp([{ path: "/", element: <MyDappPage /> }], "/", undefined, config);
    return api;
}

async function fillValidForm(user: UserEvent) {
    await user.type(screen.getByLabelText("Application name"), "Acme Wallet");
    await user.type(screen.getByLabelText("Application logo"), "https://cdn.acme.xyz/logo.png");
    await user.type(screen.getByLabelText("Callback URL 1"), "https://app.acme.xyz/callback");
    await user.type(screen.getByLabelText("Web origin 1"), "https://app.acme.xyz");
    await user.type(screen.getByLabelText("Primary contact email"), "dev@acme.xyz");
    await user.selectOptions(screen.getByLabelText("Expected monthly active users"), "1,000 – 10,000");
}

const PUT_DAPP = `PUT /api/console/dapp/${DAPP_ID}` as const;
const DELETE_DAPP = `DELETE /api/console/dapp/${DAPP_ID}` as const;

const CHANGE = {
    name: "Acme Wallet",
    description: "A wallet for NEAR.",
    logoUrl: "https://cdn.acme.xyz/logo.png",
    callbackUrls: ["https://app.acme.xyz/callback", "https://app.acme.xyz/silent"],
    logoutUrls: [],
    webOrigins: ["https://app.acme.xyz"],
};

describe("MyDappPage", () => {
    it("explains the console and offers the form when there is no dApp, then submits it", async () => {
        const user = userEvent.setup();
        const api = renderPage({
            "GET /api/console/dapp": { body: { dapp: null } },
            "POST /api/console/dapp": { status: 201, body: ownerDapp() },
        });

        expect(await screen.findByRole("heading", { name: "You haven't registered a dApp yet" })).toBeInTheDocument();
        expect(screen.getByText("owner@acme.xyz")).toBeInTheDocument();
        expect(screen.getByText(/Already approved through the earlier application form\?/)).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Contact the NEAR Auth team" })).toHaveAttribute("href", "https://discord.gg/JZfwEt82ur");
        await user.click(screen.getByRole("button", { name: "Register your dApp" }));
        expect(screen.getByRole("heading", { name: "Register your dApp" })).toHaveFocus();
        await fillValidForm(user);
        await user.click(screen.getByRole("button", { name: "Submit for review" }));

        expect(api.sent("POST /api/console/dapp")[0]?.body).toEqual({
            name: "Acme Wallet",
            description: "",
            logoUrl: "https://cdn.acme.xyz/logo.png",
            mauBracket: "1k_10k",
            callbackUrls: ["https://app.acme.xyz/callback"],
            logoutUrls: [],
            webOrigins: ["https://app.acme.xyz"],
            contactEmail: "dev@acme.xyz",
        });
    });

    it("moves focus to the dApp's title once the first submission shows it", async () => {
        const user = userEvent.setup();
        renderPage({
            "GET /api/console/dapp": { body: { dapp: null } },
            "POST /api/console/dapp": { status: 201, body: ownerDapp() },
        });

        await user.click(await screen.findByRole("button", { name: "Register your dApp" }));
        await fillValidForm(user);
        await user.click(screen.getByRole("button", { name: "Submit for review" }));

        expect(await screen.findByRole("heading", { name: "Acme Wallet", level: 1 })).toHaveFocus();
    });

    it("does not take focus when an existing dApp loads", async () => {
        renderPage({ "GET /api/console/dapp": { body: { dapp: ownerDapp() } } });

        expect(await screen.findByRole("heading", { name: "Acme Wallet", level: 1 })).not.toHaveFocus();
    });

    it("goes back from the form to the first-visit card on Cancel", async () => {
        const user = userEvent.setup();
        renderPage({ "GET /api/console/dapp": { body: { dapp: null } } });

        await user.click(await screen.findByRole("button", { name: "Register your dApp" }));
        await user.click(screen.getByRole("button", { name: "Cancel" }));

        expect(screen.getByRole("heading", { name: "You haven't registered a dApp yet" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Register your dApp" })).toHaveFocus();
    });

    it("shows a pending dApp and edits it in place with the version it showed", async () => {
        const user = userEvent.setup();
        const api = renderPage({
            "GET /api/console/dapp": { body: { dapp: ownerDapp() } },
            [PUT_DAPP]: { body: ownerDapp({ version: 4 }) },
        });

        expect(await screen.findByRole("heading", { name: "Acme Wallet", level: 1 })).toBeInTheDocument();
        expect(screen.getByText("Pending")).toBeInTheDocument();
        expect(screen.getByText("The NEAR Auth team is reviewing your application.")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Edit" }));
        await user.clear(screen.getByLabelText("Application description"));
        await user.type(screen.getByLabelText("Application description"), "The wallet.");
        await user.click(screen.getByRole("button", { name: "Save changes" }));

        expect(await screen.findByRole("button", { name: "Edit" })).toBeInTheDocument();
        expect(api.sent(PUT_DAPP)[0]?.body).toMatchObject({ description: "The wallet.", expectedVersion: 3 });
    });

    it("shows an approved dApp's client ID", async () => {
        renderPage({ "GET /api/console/dapp": { body: { dapp: ownerDapp({ status: "approved", auth0ClientId: "client-abc" }) } } });

        expect(await screen.findByText("client-abc")).toBeInTheDocument();
        expect(screen.getByText("Approved")).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Copy client ID" })).toBeInTheDocument();
        expect(screen.queryByText("Change under review")).not.toBeInTheDocument();
    });

    it.each([
        [
            "testnet",
            "auth0.jwt.fast-auth.testnet",
            "fast-auth.testnet",
            "v1.signer-prod.testnet",
            "Testnet resources",
            "https://docs.auth.near.org/resources/testnet",
        ],
        [
            "mainnet",
            "auth0.jwt.fast-auth.near",
            "fast-auth.near",
            "v1.signer",
            "Mainnet resources",
            "https://docs.auth.near.org/resources/mainnet",
        ],
    ] as const)(
        "shows an approved dApp the %s settings it plugs into",
        async (network, audience, fastAuth, mpc, resources, resourcesUrl) => {
            renderPage(
                { "GET /api/console/dapp": { body: { dapp: ownerDapp({ status: "approved", auth0ClientId: "client-abc" }) } } },
                { ...CLIENT_CONFIG, nearNetwork: network },
            );

            expect(await screen.findByText(audience)).toBeInTheDocument();
            expect(screen.getByText(network)).toBeInTheDocument();
            expect(screen.getByText(`· default for ${network}`)).toBeInTheDocument();
            expect(screen.getByText(fastAuth)).toBeInTheDocument();
            expect(screen.getByText(mpc)).toBeInTheDocument();
            expect(screen.getByText(`"${network}"`)).toBeInTheDocument();
            expect(screen.getByRole("link", { name: resources })).toHaveAttribute("href", resourcesUrl);
        },
    );

    it("names the deployment's network to a user with no dApp", async () => {
        renderPage({ "GET /api/console/dapp": { body: { dapp: null } } }, { ...CLIENT_CONFIG, nearNetwork: "testnet" });

        expect(await screen.findByText("Testnet access")).toBeInTheDocument();
        expect(screen.getByText(/and access to the testnet NEAR Auth contract\./)).toBeInTheDocument();
        expect(screen.queryByText(/mainnet/i)).not.toBeInTheDocument();
    });

    it("shows the change under review with its proposed values, and withdraws it by saving the live values", async () => {
        const user = userEvent.setup();
        const dapp = ownerDapp({
            status: "approved",
            auth0ClientId: "client-abc",
            pendingChange: CHANGE,
            pendingChangeAt: "2026-10-03T10:00:00Z",
        });
        const api = renderPage({
            "GET /api/console/dapp": { body: { dapp } },
            [PUT_DAPP]: { body: { ...dapp, pendingChange: null, version: 4 } },
        });

        expect(await screen.findByText(/Your live settings stay as they are until the NEAR Auth team approves it/)).toBeInTheDocument();
        const proposed = within(screen.getByRole("table")).getByRole("row", { name: /Callback URLs/ });
        expect(proposed).toHaveTextContent("https://app.acme.xyz/silent");
        await user.click(screen.getByRole("button", { name: "Withdraw change" }));
        expect(screen.getByRole("dialog")).toHaveAccessibleDescription(
            "The NEAR Auth team will not review it, and your live settings stay as they are.",
        );
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Withdraw change" }));

        expect(api.sent(PUT_DAPP)[0]?.body).toEqual({
            name: "Acme Wallet",
            description: "A wallet for NEAR.",
            logoUrl: "https://cdn.acme.xyz/logo.png",
            mauBracket: "1k_10k",
            callbackUrls: ["https://app.acme.xyz/callback"],
            logoutUrls: [],
            webOrigins: ["https://app.acme.xyz"],
            contactEmail: "dev@acme.xyz",
            expectedVersion: 3,
        });
    });

    it("shows a rejection's reason and resubmits through the form", async () => {
        const user = userEvent.setup();
        const dapp = ownerDapp({ status: "rejected", rejectionReason: "The callback URL points at a staging host." });
        const api = renderPage({ "GET /api/console/dapp": { body: { dapp } }, [PUT_DAPP]: { body: ownerDapp({ version: 4 }) } });

        expect(await screen.findByText("The callback URL points at a staging host.")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Edit" }));
        await user.click(screen.getByRole("button", { name: "Resubmit for review" }));

        expect(api.sent(PUT_DAPP)[0]?.body).toMatchObject({ name: "Acme Wallet", expectedVersion: 3 });
    });

    it("removes the dApp once its name is typed, with the version it showed", async () => {
        const user = userEvent.setup();
        const api = renderPage({
            "GET /api/console/dapp": { body: { dapp: ownerDapp() } },
            [DELETE_DAPP]: { status: 204 },
        });

        await user.click(await screen.findByRole("button", { name: "Edit" }));
        await user.click(screen.getByRole("button", { name: "Remove dApp" }));
        const dialog = screen.getByRole("dialog", { name: "Remove Acme Wallet?" });
        expect(dialog).toHaveAccessibleDescription(
            "This deletes the dApp and takes it out of the review queue. It can't be undone. A new dApp can be submitted afterwards with the same email.",
        );
        expect(within(dialog).getByRole("button", { name: "Remove dApp" })).toBeDisabled();
        await user.type(within(dialog).getByLabelText("Type Acme Wallet to confirm"), "Acme Wallet");
        await user.click(within(dialog).getByRole("button", { name: "Remove dApp" }));

        expect(await screen.findByRole("heading", { name: "You haven't registered a dApp yet" })).toHaveFocus();
        expect(api.sent(DELETE_DAPP)[0]?.query.get("expectedVersion")).toBe("3");
    });

    it("removes against the version shown when the dialog opened; a newer one closes it", async () => {
        const user = userEvent.setup();
        const routes: MockRoutes = {
            "GET /api/console/dapp": { body: { dapp: ownerDapp() } },
            [DELETE_DAPP]: apiError(409, "DAPP_CHANGED"),
        };
        const api = renderPage(routes);

        await user.click(await screen.findByRole("button", { name: "Edit" }));
        await user.click(screen.getByRole("button", { name: "Remove dApp" }));
        const dialog = screen.getByRole("dialog", { name: "Remove Acme Wallet?" });
        routes["GET /api/console/dapp"] = { body: { dapp: ownerDapp({ status: "approved", auth0ClientId: "client-abc", version: 4 }) } };
        refocus();
        await within(dialog).findByText(/stop working immediately/);
        await user.type(within(dialog).getByLabelText("Type Acme Wallet to confirm"), "Acme Wallet");
        await user.click(within(dialog).getByRole("button", { name: "Remove dApp" }));

        expect(api.sent(DELETE_DAPP)[0]?.query.get("expectedVersion")).toBe("3");
        expect(await screen.findByRole("alert")).toHaveTextContent("Nothing was done");
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("announces that a withdrawal did nothing when the dApp changed meanwhile", async () => {
        const user = userEvent.setup();
        const dapp = ownerDapp({
            status: "approved",
            auth0ClientId: "client-abc",
            pendingChange: CHANGE,
            pendingChangeAt: "2026-10-03T10:00:00Z",
        });
        renderPage({ "GET /api/console/dapp": { body: { dapp } }, [PUT_DAPP]: apiError(409, "DAPP_CHANGED") });

        await user.click(await screen.findByRole("button", { name: "Withdraw change" }));
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Withdraw change" }));

        expect(await screen.findByRole("alert")).toHaveTextContent("Nothing was done");
    });

    it("keeps the edit form and its edits when a background refetch fails", async () => {
        const user = userEvent.setup();
        const routes: MockRoutes = { "GET /api/console/dapp": { body: { dapp: ownerDapp() } } };
        renderPage(routes);

        await user.click(await screen.findByRole("button", { name: "Edit" }));
        await user.type(screen.getByLabelText("Application name"), " v2");
        routes["GET /api/console/dapp"] = apiError(429, "RATE_LIMITED");
        refocus();

        expect(await screen.findByText("Could not refresh, so this may be out of date")).toBeInTheDocument();
        expect(screen.getByLabelText("Application name")).toHaveValue("Acme Wallet v2");
    });

    it("says when the dApp changed meanwhile and reloads the latest version", async () => {
        const user = userEvent.setup();
        const routes: MockRoutes = {
            "GET /api/console/dapp": { body: { dapp: ownerDapp() } },
            [PUT_DAPP]: (request) =>
                (request.body as { expectedVersion: number }).expectedVersion === 4
                    ? { body: ownerDapp({ version: 5 }) }
                    : apiError(409, "DAPP_CHANGED"),
        };
        const api = renderPage(routes);

        await user.click(await screen.findByRole("button", { name: "Edit" }));
        routes["GET /api/console/dapp"] = { body: { dapp: ownerDapp({ version: 4, description: "Changed" }) } };
        await user.click(screen.getByRole("button", { name: "Save changes" }));
        const alert = await screen.findByRole("alert");
        expect(alert).toHaveTextContent("This dApp changed since you opened it.");
        await user.click(within(alert).getByRole("button", { name: "Reload" }));
        expect(screen.getByRole("heading", { name: "Acme Wallet", level: 1 })).toHaveFocus();
        expect(screen.getByLabelText("Application description")).toHaveValue("Changed");
        await user.click(screen.getByRole("button", { name: "Save changes" }));

        expect(await screen.findByRole("button", { name: "Edit" })).toBeInTheDocument();
        const versions = api.sent(PUT_DAPP).map((request) => (request.body as { expectedVersion: number }).expectedVersion);
        expect(versions).toEqual([3, 4]);
    });

    it("leaves the form when its change is withdrawn, as the form's version is then out of date", async () => {
        const user = userEvent.setup();
        const dapp = ownerDapp({
            status: "approved",
            auth0ClientId: "client-abc",
            pendingChange: CHANGE,
            pendingChangeAt: "2026-10-03T10:00:00Z",
        });
        const withdrawn = { ...dapp, pendingChange: null, pendingChangeAt: null, version: 4 };
        renderPage({
            "GET /api/console/dapp": { body: { dapp } },
            [PUT_DAPP]: { body: withdrawn },
        });

        await user.click(await screen.findByRole("button", { name: "Edit" }));
        await user.click(screen.getByRole("button", { name: "Withdraw change" }));
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Withdraw change" }));

        expect(await screen.findByRole("button", { name: "Edit" })).toBeInTheDocument();
        expect(screen.queryByLabelText("Application name")).not.toBeInTheDocument();
    });

    it("clears a dialog's Nothing was done once the user edits again", async () => {
        const user = userEvent.setup();
        renderPage({
            "GET /api/console/dapp": { body: { dapp: ownerDapp() } },
            [DELETE_DAPP]: apiError(409, "DAPP_CHANGED"),
            [PUT_DAPP]: { body: ownerDapp({ version: 4 }) },
        });

        await user.click(await screen.findByRole("button", { name: "Edit" }));
        await user.click(screen.getByRole("button", { name: "Remove dApp" }));
        const dialog = screen.getByRole("dialog", { name: "Remove Acme Wallet?" });
        await user.type(within(dialog).getByLabelText("Type Acme Wallet to confirm"), "Acme Wallet");
        await user.click(within(dialog).getByRole("button", { name: "Remove dApp" }));
        expect(await screen.findByText("Nothing was done")).toBeInTheDocument();
        await user.click(screen.getByRole("button", { name: "Edit" }));
        await user.click(screen.getByRole("button", { name: "Save changes" }));

        expect(await screen.findByRole("button", { name: "Edit" })).toBeInTheDocument();
        expect(screen.queryByText("Nothing was done")).not.toBeInTheDocument();
    });

    it("moves focus to the title when switching between the details and the form", async () => {
        const user = userEvent.setup();
        renderPage({ "GET /api/console/dapp": { body: { dapp: ownerDapp() } } });

        await user.click(await screen.findByRole("button", { name: "Edit" }));
        expect(screen.getByRole("heading", { name: "Acme Wallet", level: 1 })).toHaveFocus();
        await user.click(screen.getByRole("button", { name: "Back to My dApp" }));
        expect(screen.getByRole("heading", { name: "Acme Wallet", level: 1 })).toHaveFocus();
    });

    it("moves focus to the title once a change withdrawn from the details is gone", async () => {
        const user = userEvent.setup();
        const dapp = ownerDapp({
            status: "approved",
            auth0ClientId: "client-abc",
            pendingChange: CHANGE,
            pendingChangeAt: "2026-10-03T10:00:00Z",
        });
        const withdrawn = { ...dapp, pendingChange: null, pendingChangeAt: null, version: 4 };
        renderPage({
            "GET /api/console/dapp": { body: { dapp } },
            [PUT_DAPP]: { body: withdrawn },
        });

        await user.click(await screen.findByRole("button", { name: "Withdraw change" }));
        await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Withdraw change" }));

        await waitFor(() => expect(screen.queryByRole("button", { name: "Withdraw change" })).not.toBeInTheDocument());
        await waitFor(() => expect(screen.getByRole("heading", { name: "Acme Wallet", level: 1 })).toHaveFocus());
    });
});
