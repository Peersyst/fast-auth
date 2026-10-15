import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Link } from "react-router-dom";
import { describe, expect, it } from "vitest";
import type { AdminDapp, DappEvent } from "../../api/client";
import { formatDateTime } from "../../lib/format";
import { adminDapp, apiError, mockApi, refocus, renderApp, type MockRoutes } from "../../test/api";
import { DappDetail } from "./DappDetail";
import { DappsList } from "./DappsList";

const ID = "0d9f3b8e-1c5e-4a40-9c0e-6a6f7f0b5a11";
const PATH = `/api/console/admin/dapps/${ID}`;
const REASON = "The callback URL points at a staging host.";
const AT = "2026-10-04T10:00:00.000Z";
const MISMATCH = "Auth0 client c1 is not tagged with dApp 0d9f3b8e for console-test";
const PENDING_CHANGE = {
    name: "Acme Pay",
    description: "A wallet for NEAR.",
    logoUrl: "https://cdn.acme.xyz/logo.png",
    callbackUrls: ["https://app.acme.xyz/callback"],
    logoutUrls: [],
    webOrigins: ["https://app.acme.xyz"],
};

const REMOVED = adminDapp({
    status: "removed",
    auth0ClientId: "abcDEF123",
    auth0SyncedAt: AT,
    removedAt: AT,
    removedBy: "admin@near.org",
    removalReason: REASON,
});

const EVENTS: DappEvent[] = [
    {
        id: "e3",
        type: "edited",
        actorEmail: "owner@acme.xyz",
        actorRole: "user",
        details: { changes: [{ field: "mauBracket", before: "lt1k", after: "1k_10k" }] },
        createdAt: "2026-10-04T10:00:00.000Z",
    },
    {
        id: "e2",
        type: "change_requested",
        actorEmail: "owner@acme.xyz",
        actorRole: "user",
        details: { changes: [{ field: "name", before: "Acme Wallet", after: "Acme Pay" }, { field: "contactEmail" }] },
        createdAt: "2026-10-03T10:00:00.000Z",
    },
    {
        id: "e1",
        type: "auth0_failed",
        actorEmail: null,
        actorRole: "system",
        details: { op: "create", error: "Timeout after 10000 ms" },
        createdAt: "2026-10-02T10:00:00.000Z",
    },
];

function renderDetail(dapp: AdminDapp, routes: MockRoutes = {}) {
    const api = mockApi({ [`GET ${PATH}`]: { body: dapp }, [`GET ${PATH}/events`]: { body: EVENTS }, ...routes });
    renderApp([{ path: "/admin/dapps/:id", element: <DappDetail /> }], `/admin/dapps/${ID}`);
    return api;
}

function eventItem(log: HTMLElement, label: string): HTMLElement {
    const item = within(log).getByText(label).closest("li");
    if (!item) throw new Error(`No event labelled ${label}`);
    return item;
}

async function openDialog(name: string) {
    await userEvent.click(await screen.findByRole("button", { name }));
    return screen.getByRole("dialog");
}

describe("DappDetail", () => {
    it("shows the dApp, its logo, the Auth0 error and the activity log", async () => {
        renderDetail(adminDapp({ auth0Error: "Auth0 timed out" }));

        expect(await screen.findByRole("heading", { name: "Acme Wallet" })).toBeInTheDocument();
        expect(screen.getByRole("img", { name: "Logo of Acme Wallet" })).toHaveAttribute("src", "https://cdn.acme.xyz/logo.png");
        expect(screen.getByRole("alert")).toHaveTextContent(
            "Auth0 timed outThe console saved nothing, though Auth0 may hold part of the failed write. Retrying the same action is safe; this clears after the next successful Auth0 write.",
        );
        expect(screen.getByRole("link", { name: "owner@acme.xyz" })).toHaveAttribute("href", "mailto:owner@acme.xyz");
        expect(screen.getByText("https://app.acme.xyz/callback")).toBeInTheDocument();
        const log = await screen.findByRole("region", { name: "Activity" });
        expect(await within(log).findByText("Change requested")).toBeInTheDocument();
        expect(within(log).getByRole("row", { name: /Name/ })).toHaveTextContent("Acme WalletAcme Pay");
        expect(within(log).getByText("The contact email changed.")).toBeInTheDocument();
        expect(within(log).getByRole("row", { name: /Expected MAU/ })).toHaveTextContent("Less than 1,0001,000 – 10,000");
        expect(within(log).getByText("Auth0 call failed")).toBeInTheDocument();
        expect(within(log).getByText("Timeout after 10000 ms")).toBeInTheDocument();
    });

    it("announces that the activity is loading", async () => {
        renderDetail(adminDapp(), { [`GET ${PATH}/events`]: () => new Promise(() => undefined) });

        const activity = await screen.findByRole("region", { name: "Activity" });

        expect(within(activity).getByRole("status")).toHaveTextContent("Loading the activity");
    });

    it("approves with the version on screen", async () => {
        const api = renderDetail(adminDapp(), { [`POST ${PATH}/approve`]: { body: adminDapp({ status: "approved", version: 4 }) } });

        const dialog = await openDialog("Approve");
        await userEvent.click(within(dialog).getByRole("button", { name: "Approve and provision" }));

        expect(api.sent(`POST ${PATH}/approve`)[0]?.body).toEqual({ expectedVersion: 3 });
    });

    it("rejects with a reason", async () => {
        const api = renderDetail(adminDapp(), { [`POST ${PATH}/reject`]: { body: adminDapp({ status: "rejected", version: 4 }) } });

        const dialog = await openDialog("Reject");
        await userEvent.type(within(dialog).getByLabelText("Reason"), REASON);
        await userEvent.click(within(dialog).getByRole("button", { name: "Reject and notify" }));

        expect(api.sent(`POST ${PATH}/reject`)[0]?.body).toEqual({ expectedVersion: 3, reason: REASON });
    });

    it("reviews a pending change from its diff", async () => {
        const pendingChange = { ...PENDING_CHANGE, logoUrl: "https://cdn.acme.xyz/pay.png" };
        const dapp = adminDapp({ status: "approved", auth0ClientId: "client-abc", pendingChange, version: 7 });
        const api = renderDetail(dapp, {
            [`POST ${PATH}/change/approve`]: { body: { ...dapp, pendingChange: null, version: 8 } },
            [`POST ${PATH}/change/reject`]: { body: { ...dapp, pendingChange: null, version: 8 } },
        });

        const review = await screen.findByRole("region", { name: "Change under review" });
        expect(within(review).getByRole("row", { name: /Name/ })).toHaveTextContent("Acme WalletAcme Pay");
        expect(within(review).getByRole("img", { name: "Proposed logo of Acme Pay" })).toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();

        await userEvent.click(within(await openDialog("Approve change")).getByRole("button", { name: "Approve change" }));
        expect(api.sent(`POST ${PATH}/change/approve`)[0]?.body).toEqual({ expectedVersion: 7 });

        const reject = await openDialog("Reject change");
        await userEvent.type(within(reject).getByLabelText("Reason"), REASON);
        await userEvent.click(within(reject).getByRole("button", { name: "Reject change" }));
        expect(api.sent(`POST ${PATH}/change/reject`)[0]?.body).toEqual({ expectedVersion: 7, reason: REASON });
    });

    it("changes the owner to a valid email, explaining an invalid one", async () => {
        const api = renderDetail(adminDapp(), { [`POST ${PATH}/owner`]: { body: adminDapp({ ownerEmail: "new@acme.xyz", version: 4 }) } });

        const dialog = await openDialog("Change owner");
        const email = within(dialog).getByLabelText("New owner's email");
        const confirm = within(dialog).getByRole("button", { name: "Change owner" });
        await userEvent.type(email, "new@acme");
        await userEvent.click(confirm);
        expect(email).toHaveAccessibleDescription("Enter a valid email address.");
        expect(api.sent(`POST ${PATH}/owner`)).toHaveLength(0);

        await userEvent.type(email, ".xyz");
        await userEvent.click(confirm);

        expect(api.sent(`POST ${PATH}/owner`)[0]?.body).toEqual({ expectedVersion: 3, ownerEmail: "new@acme.xyz" });
    });

    it("says the new owner already has a dApp when the email is taken", async () => {
        renderDetail(adminDapp(), { [`POST ${PATH}/owner`]: apiError(409, "DAPP_ALREADY_EXISTS") });

        const dialog = await openDialog("Change owner");
        await userEvent.type(within(dialog).getByLabelText("New owner's email"), "taken@acme.xyz");
        await userEvent.click(within(dialog).getByRole("button", { name: "Change owner" }));

        expect(await within(dialog).findByRole("alert")).toHaveTextContent("That email already owns a dApp. Each email can own one.");
        expect(dialog).not.toHaveTextContent("Reload to see it");
    });

    it("removes once the name and a reason are given", async () => {
        const api = renderDetail(adminDapp(), { [`POST ${PATH}/remove`]: { body: adminDapp({ status: "removed", version: 4 }) } });

        const dialog = await openDialog("Remove dApp…");
        const confirm = within(dialog).getByRole("button", { name: "Remove dApp" });
        await userEvent.type(within(dialog).getByLabelText("Reason"), REASON);
        expect(confirm).toBeDisabled();
        await userEvent.type(within(dialog).getByLabelText("Type Acme Wallet to confirm"), "Acme Wallet");
        await userEvent.click(confirm);

        expect(api.sent(`POST ${PATH}/remove`)[0]?.body).toEqual({ expectedVersion: 3, reason: REASON });
    });

    it("edits on behalf of the owner with the version it showed", async () => {
        const api = renderDetail(adminDapp(), { [`PUT ${PATH}`]: { body: adminDapp({ version: 4 }) } });

        await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
        await userEvent.clear(screen.getByLabelText("Application name"));
        await userEvent.type(screen.getByLabelText("Application name"), "Acme Pay");
        await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

        expect(api.sent(`PUT ${PATH}`)[0]?.body).toMatchObject({ name: "Acme Pay", expectedVersion: 3 });
    });

    it("asks before saving an approved dApp's synced fields, lists what changes, and saves only on Save and apply", async () => {
        const approved = adminDapp({ status: "approved", auth0ClientId: "abcDEF123" });
        const api = renderDetail(approved, { [`PUT ${PATH}`]: { body: adminDapp({ status: "approved", version: 4 }) } });

        await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
        await userEvent.clear(screen.getByLabelText("Application name"));
        await userEvent.type(screen.getByLabelText("Application name"), "Acme Pay");
        await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

        let dialog = await screen.findByRole("dialog", { name: "Apply changes to the live app?" });
        expect(within(dialog).getByRole("row", { name: /Name/ })).toHaveTextContent("Acme WalletAcme Pay");
        await userEvent.click(within(dialog).getByRole("button", { name: "Keep editing" }));
        expect(api.sent(`PUT ${PATH}`)).toEqual([]);
        expect(screen.getByLabelText("Application name")).toHaveValue("Acme Pay");

        await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
        dialog = await screen.findByRole("dialog", { name: "Apply changes to the live app?" });
        await userEvent.click(within(dialog).getByRole("button", { name: "Save and apply" }));

        await waitFor(() => expect(api.sent(`PUT ${PATH}`)).toHaveLength(1));
        expect(api.sent(`PUT ${PATH}`)[0]?.body).toMatchObject({ name: "Acme Pay", expectedVersion: 3 });
    });

    it("saves an approved dApp's contact email without asking, since it does not touch the live client", async () => {
        const approved = adminDapp({ status: "approved", auth0ClientId: "abcDEF123" });
        const api = renderDetail(approved, { [`PUT ${PATH}`]: { body: adminDapp({ status: "approved", version: 4 }) } });

        await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
        await userEvent.clear(screen.getByLabelText("Primary contact email"));
        await userEvent.type(screen.getByLabelText("Primary contact email"), "ops@acme.xyz");
        await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

        await waitFor(() => expect(api.sent(`PUT ${PATH}`)).toHaveLength(1));
        expect(screen.queryByRole("dialog", { name: "Apply changes to the live app?" })).not.toBeInTheDocument();
    });

    it("decides on the version shown when the dialog opened; a newer one closes it so the admin reviews again", async () => {
        const routes: MockRoutes = {
            [`GET ${PATH}`]: { body: adminDapp() },
            [`GET ${PATH}/events`]: { body: [] },
            [`POST ${PATH}/approve`]: (request) =>
                (request.body as { expectedVersion: number }).expectedVersion === 4
                    ? { body: adminDapp({ status: "approved", version: 5 }) }
                    : apiError(409, "DAPP_CHANGED"),
        };
        const api = mockApi(routes);
        renderApp([{ path: "/admin/dapps/:id", element: <DappDetail /> }], `/admin/dapps/${ID}`);

        const dialog = await openDialog("Approve");
        routes[`GET ${PATH}`] = { body: adminDapp({ version: 4, callbackUrls: ["https://other.example/cb"] }) };
        refocus();
        await screen.findByText("https://other.example/cb");
        await userEvent.click(within(dialog).getByRole("button", { name: "Approve and provision" }));

        expect(
            await screen.findByText("This dApp changed since you opened that dialog. Review its latest version below, then decide again."),
        ).toBeInTheDocument();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
        await userEvent.click(within(await openDialog("Approve")).getByRole("button", { name: "Approve and provision" }));
        expect(api.sent(`POST ${PATH}/approve`).map((request) => request.body)).toEqual([{ expectedVersion: 3 }, { expectedVersion: 4 }]);
    });

    it("keeps the dialog open while the action is in flight, so an answer that the dApp changed is still reported", async () => {
        let answer: () => void = () => undefined;
        const gate = new Promise<void>((resolve) => (answer = resolve));
        renderDetail(adminDapp(), {
            [`POST ${PATH}/approve`]: async () => {
                await gate;
                return apiError(409, "DAPP_CHANGED");
            },
        });

        const dialog = await openDialog("Approve");
        await userEvent.click(within(dialog).getByRole("button", { name: "Approve and provision" }));
        await userEvent.keyboard("{Escape}");
        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
        answer();
        expect(await screen.findByText("Nothing was done")).toBeInTheDocument();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("cannot be cancelled while the owner change is in flight", async () => {
        let answer: () => void = () => undefined;
        const gate = new Promise<void>((resolve) => (answer = resolve));
        renderDetail(adminDapp(), {
            [`POST ${PATH}/owner`]: async () => {
                await gate;
                return apiError(409, "DAPP_CHANGED");
            },
        });

        const dialog = await openDialog("Change owner");
        await userEvent.type(within(dialog).getByLabelText("New owner's email"), "new@acme.xyz");
        await userEvent.click(within(dialog).getByRole("button", { name: "Change owner" }));
        await userEvent.keyboard("{Escape}");

        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
        answer();
        expect(await screen.findByText("Nothing was done")).toBeInTheDocument();
    });

    it("starts each dApp's page afresh when moving between dApps that are already loaded", async () => {
        const other = "5b1c2d3e-0000-4000-8000-000000000002";
        const otherPath = `/api/console/admin/dapps/${other}`;
        mockApi({
            [`GET ${PATH}`]: { body: adminDapp() },
            [`GET ${PATH}/events`]: { body: [] },
            [`GET ${otherPath}`]: { body: adminDapp({ id: other, name: "Beta Bridge" }) },
            [`GET ${otherPath}/events`]: { body: [] },
        });
        renderApp(
            [
                {
                    path: "/admin/dapps/:id",
                    element: (
                        <>
                            <Link to={`/admin/dapps/${other}`}>Go to Beta Bridge</Link>
                            <Link to={`/admin/dapps/${ID}`}>Go to Acme Wallet</Link>
                            <DappDetail />
                        </>
                    ),
                },
            ],
            `/admin/dapps/${ID}`,
        );
        await screen.findByRole("heading", { name: "Acme Wallet", level: 1 });
        await userEvent.click(screen.getByRole("link", { name: "Go to Beta Bridge" }));
        await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
        expect(screen.getByLabelText("Application name")).toHaveValue("Beta Bridge");

        await userEvent.click(screen.getByRole("link", { name: "Go to Acme Wallet" }));

        expect(await screen.findByRole("heading", { name: "Acme Wallet", level: 1 })).toBeInTheDocument();
        expect(screen.queryByLabelText("Application name")).not.toBeInTheDocument();
    });

    it("approves a change on the version shown when its dialog opened", async () => {
        const routes: MockRoutes = {
            [`GET ${PATH}`]: { body: adminDapp({ status: "approved", version: 7, pendingChange: PENDING_CHANGE }) },
            [`GET ${PATH}/events`]: { body: [] },
            [`POST ${PATH}/change/approve`]: apiError(409, "DAPP_CHANGED"),
        };
        const api = mockApi(routes);
        renderApp([{ path: "/admin/dapps/:id", element: <DappDetail /> }], `/admin/dapps/${ID}`);

        const dialog = await openDialog("Approve change");
        routes[`GET ${PATH}`] = {
            body: adminDapp({ status: "approved", version: 8, pendingChange: { ...PENDING_CHANGE, name: "Acme Cash" } }),
        };
        refocus();
        await screen.findByText("Acme Cash");
        await userEvent.click(within(dialog).getByRole("button", { name: "Approve change" }));

        expect(api.sent(`POST ${PATH}/change/approve`)[0]?.body).toEqual({ expectedVersion: 7 });
        expect(await screen.findByText("Nothing was done")).toBeInTheDocument();
    });

    it("closes the edit form on Reload when the latest version has a pending change", async () => {
        const routes: MockRoutes = {
            [`GET ${PATH}`]: { body: adminDapp({ status: "approved", auth0ClientId: "client-abc" }) },
            [`GET ${PATH}/events`]: { body: [] },
            [`PUT ${PATH}`]: apiError(409, "DAPP_CHANGED"),
        };
        mockApi(routes);
        renderApp([{ path: "/admin/dapps/:id", element: <DappDetail /> }], `/admin/dapps/${ID}`);

        await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
        routes[`GET ${PATH}`] = {
            body: adminDapp({ status: "approved", auth0ClientId: "client-abc", pendingChange: PENDING_CHANGE, version: 4 }),
        };
        await userEvent.click(screen.getByRole("button", { name: "Save changes" }));
        await userEvent.click(within(await screen.findByRole("alert")).getByRole("button", { name: "Reload" }));

        expect(screen.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument();
        expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
        expect(screen.getByRole("region", { name: "Change under review" })).toBeInTheDocument();
    });

    it("keeps the page and an open form when a background refetch fails", async () => {
        const routes: MockRoutes = { [`GET ${PATH}`]: { body: adminDapp() }, [`GET ${PATH}/events`]: { body: [] } };
        mockApi(routes);
        renderApp([{ path: "/admin/dapps/:id", element: <DappDetail /> }], `/admin/dapps/${ID}`);

        await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
        await userEvent.type(screen.getByLabelText("Application name"), " Pay");
        routes[`GET ${PATH}`] = apiError(429, "RATE_LIMITED");
        refocus();

        expect(await screen.findByText("Could not refresh, so this may be out of date")).toBeInTheDocument();
        expect(screen.getByLabelText("Application name")).toHaveValue("Acme Wallet Pay");
    });

    it.each([
        ["pending", adminDapp(), ["Approve", "Reject", "Edit", "Change owner", "Remove dApp…"]],
        ["approved", adminDapp({ status: "approved", auth0ClientId: "abcDEF123" }), ["Edit", "Change owner", "Copy", "Remove dApp…"]],
        ["rejected", adminDapp({ status: "rejected", rejectionReason: REASON }), ["Edit", "Change owner", "Remove dApp…"]],
        ["removed", REMOVED, []],
    ])("offers only the actions a %s dApp allows", async (_status, dapp, buttons) => {
        renderDetail(dapp, { [`GET ${PATH}/events`]: { body: [] } });

        await screen.findByRole("heading", { name: "Acme Wallet", level: 1 });

        expect(screen.queryAllByRole("button").map((button) => button.textContent)).toEqual(buttons);
    });

    it("shows when, by whom and why a dApp was removed", async () => {
        renderDetail(REMOVED);

        const notice = (await screen.findByText("Removed", { selector: "p" })).parentElement;

        expect(notice).toHaveTextContent(`${formatDateTime(AT)} by admin@near.org.${REASON}`);
    });

    it("shows a removed dApp's Auth0 client as its former one, deleted at removal, with nothing to copy", async () => {
        renderDetail(REMOVED);

        await screen.findByRole("heading", { name: "Acme Wallet", level: 1 });

        expect(screen.getByText("Former client ID").nextElementSibling).toHaveTextContent("abcDEF123");
        expect(screen.getByText("Deleted from Auth0").nextElementSibling).toHaveTextContent(formatDateTime(AT));
        expect(screen.queryByText("Client ID")).not.toBeInTheDocument();
        expect(screen.queryByText("Synced to Auth0")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Copy client ID" })).not.toBeInTheDocument();
    });

    it("says a removal went through when the console left a client not tagged as the dApp's", async () => {
        renderDetail(adminDapp({ status: "removed", auth0ClientId: "c1", removedAt: AT, auth0Error: MISMATCH }), {
            [`GET ${PATH}/events`]: { body: [] },
        });

        expect(await screen.findByRole("alert")).toHaveTextContent(
            `${MISMATCH}The removal went through, but the console left this Auth0 client in place because it is not tagged as this dApp's. ` +
                "Check in the Auth0 dashboard what uses it before you delete it there by hand.",
        );
        expect(screen.getByText("Former client ID").nextElementSibling).toHaveTextContent("c1");
        expect(screen.queryByText("Deleted from Auth0")).not.toBeInTheDocument();
    });

    it("says a rejection went through when the console left a client not tagged as the dApp's, and that a failed removal saved nothing", async () => {
        renderDetail(adminDapp({ status: "rejected", rejectionReason: REASON, auth0Error: MISMATCH }), {
            [`GET ${PATH}/events`]: { body: [] },
        });

        expect(await screen.findByRole("alert")).toHaveTextContent(
            `${MISMATCH}If this came from the rejection, the rejection went through and the console left this Auth0 client in place ` +
                "because it is not tagged as this dApp's. Check in the Auth0 dashboard what uses it before you delete it there by hand. " +
                "If it came from a removal, the console saved nothing and retrying it is safe.",
        );
    });

    it("shows erased personal data as erased, never as an address or a person", async () => {
        renderDetail(
            adminDapp({
                status: "removed",
                ownerEmail: "erased",
                contactEmail: "erased",
                reviewedAt: AT,
                reviewedBy: "erased",
                removedAt: AT,
                removedBy: "erased",
            }),
            {
                [`GET ${PATH}/events`]: {
                    body: [{ id: "e1", type: "removed", details: {}, actorEmail: "erased", actorRole: "admin", createdAt: AT }],
                },
            },
        );

        const log = await screen.findByRole("region", { name: "Activity" });
        expect(await within(log).findByText("Removed")).toBeInTheDocument();
        expect(eventItem(log, "Removed")).toHaveTextContent("by an erased address (admin)");
        expect(screen.getAllByRole("link").map((link) => link.getAttribute("href"))).toEqual(["/admin/dapps"]);
        expect(screen.getByText(/^Submitted/)).toHaveTextContent(/· owned by an erased address$/);
        expect(screen.getByText("Removed", { selector: "p" }).parentElement).toHaveTextContent(
            new RegExp(`${formatDateTime(AT)} by an erased address\\.$`),
        );
        expect(screen.getByText("Reviewed").nextElementSibling).toHaveTextContent(/by an erased address$/);
        expect(screen.getByText("Primary contact").nextElementSibling).toHaveTextContent("Erased · to reach the team");
        expect(screen.getByText("Owner").nextElementSibling).toHaveTextContent("Erased · owns this dApp");
    });

    it("shows what each kind of event recorded", async () => {
        const system = { actorEmail: null, actorRole: "system", createdAt: AT } as const;
        const admin = { actorEmail: "admin@near.org", actorRole: "admin", createdAt: AT } as const;
        const owner = { actorEmail: "owner@acme.xyz", actorRole: "user", createdAt: AT } as const;
        const events: DappEvent[] = [
            { id: "18", type: "email_failed", details: { template: "admin_alert", error: "SES throttled" }, ...system },
            { id: "17", type: "email_sent", details: { template: "removed_by_admin" }, ...system },
            { id: "16", type: "auth0_deleted", details: { clientId: "cid-old" }, ...system },
            { id: "15", type: "auth0_failed", details: { op: "delete", error: MISMATCH, clientId: "cid-foreign" }, ...system },
            { id: "14", type: "removed", details: {}, ...admin },
            { id: "13", type: "owner_changed", details: {}, ...admin },
            {
                id: "12",
                type: "auth0_updated",
                details: { clientId: "cid-new", payload: { ...PENDING_CHANGE, name: "Acme Cash" } },
                ...system,
            },
            {
                id: "11",
                type: "change_approved",
                details: { changes: [{ field: "webOrigins", before: ["https://app.acme.xyz"], after: ["https://pay.acme.xyz"] }] },
                ...admin,
            },
            { id: "10", type: "change_rejected", details: { reason: "The new logo is a placeholder." }, ...admin },
            { id: "9", type: "change_withdrawn", details: {}, ...owner },
            {
                id: "8",
                type: "change_requested",
                details: { changes: [{ field: "name", before: "Acme Wallet", after: "Acme Pay" }] },
                ...owner,
            },
            {
                id: "7",
                type: "edited",
                details: { changes: [{ field: "mauBracket", before: "lt1k", after: "1k_10k" }, { field: "contactEmail" }] },
                ...admin,
            },
            { id: "6", type: "auth0_created", details: { clientId: "cid-new", payload: PENDING_CHANGE }, ...system },
            { id: "5", type: "auto_approved", details: {}, ...system },
            { id: "4", type: "approved", details: {}, ...admin },
            { id: "3", type: "resubmitted", details: {}, ...owner },
            { id: "2", type: "rejected", details: { reason: REASON }, ...admin },
            { id: "1", type: "submitted", details: { chosenForAutoApproval: true }, ...owner },
        ];
        renderDetail(adminDapp({ status: "removed", removedAt: AT }), { [`GET ${PATH}/events`]: { body: events } });

        const log = await screen.findByRole("region", { name: "Activity" });
        await within(log).findByText("Email failed");

        expect(within(log).getByText("18 events · newest first")).toBeInTheDocument();
        expect(eventItem(log, "Email failed")).toHaveTextContent("by the system");
        expect(eventItem(log, "Email failed")).toHaveTextContent("Email: alert, to the admins.Error: SES throttled");
        expect(eventItem(log, "Email sent")).toHaveTextContent("Email: removed by an admin, to the owner.");
        expect(eventItem(log, "Auth0 client deleted")).toHaveTextContent("Client ID: cid-old");
        expect(eventItem(log, "Auth0 call failed")).toHaveTextContent(`Auth0 operation: delete.Error: ${MISMATCH}Client ID: cid-foreign`);
        expect(eventItem(log, "Removed")).toHaveTextContent(`by admin@near.org (admin)`);
        expect(within(eventItem(log, "Removed")).queryByRole("blockquote")).not.toBeInTheDocument();
        expect(eventItem(log, "Owner changed")).toHaveTextContent("by admin@near.org (admin)");
        expect(eventItem(log, "Auth0 client updated")).toHaveTextContent("Client ID: cid-newValues sent to Auth0");
        expect(within(eventItem(log, "Auth0 client updated")).getByText("Acme Cash")).toBeInTheDocument();
        expect(within(eventItem(log, "Change approved")).getByRole("row", { name: /Web origins/ })).toHaveTextContent(
            "https://app.acme.xyzhttps://pay.acme.xyz",
        );
        expect(within(eventItem(log, "Change rejected")).getByRole("blockquote")).toHaveTextContent("The new logo is a placeholder.");
        expect(eventItem(log, "Change withdrawn")).toHaveTextContent("by owner@acme.xyz (owner)");
        expect(within(eventItem(log, "Change requested")).getByRole("row", { name: /Name/ })).toHaveTextContent("Acme WalletAcme Pay");
        expect(within(eventItem(log, "Edited")).getByRole("row", { name: /Expected MAU/ })).toHaveTextContent(
            "Less than 1,0001,000 – 10,000",
        );
        expect(eventItem(log, "Edited")).toHaveTextContent("The contact email changed.");
        expect(eventItem(log, "Auth0 client created")).toHaveTextContent("Client ID: cid-newValues sent to Auth0");
        expect(within(eventItem(log, "Auth0 client created")).getByText("Acme Pay")).toBeInTheDocument();
        expect(eventItem(log, "Auto-approved")).toHaveTextContent("by the system");
        expect(eventItem(log, "Approved")).toHaveTextContent("by admin@near.org (admin)");
        expect(eventItem(log, "Resubmitted for review")).toHaveTextContent("by owner@acme.xyz (owner)");
        expect(within(eventItem(log, "Rejected")).getByRole("blockquote")).toHaveTextContent(REASON);
        expect(eventItem(log, "Submitted for review")).toHaveTextContent("by owner@acme.xyz (owner)");
        expect(eventItem(log, "Submitted for review")).toHaveTextContent("Chosen for auto-approval.");
    });

    it("keeps the loaded activity when a background refetch of it fails", async () => {
        const routes: MockRoutes = { [`GET ${PATH}`]: { body: adminDapp() }, [`GET ${PATH}/events`]: { body: EVENTS } };
        mockApi(routes);
        renderApp([{ path: "/admin/dapps/:id", element: <DappDetail /> }], `/admin/dapps/${ID}`);
        const log = await screen.findByRole("region", { name: "Activity" });
        await within(log).findByText("Change requested");

        routes[`GET ${PATH}/events`] = apiError(429, "RATE_LIMITED");
        refocus();

        expect(await within(log).findByText("Could not refresh, so this may be out of date")).toBeInTheDocument();
        expect(within(log).getByText("Change requested")).toBeInTheDocument();
        expect(within(log).getByText("3 events · newest first")).toBeInTheDocument();
    });

    it("moves focus to the title when the edit form opens, is cancelled, and saves", async () => {
        renderDetail(adminDapp(), { [`PUT ${PATH}`]: { body: adminDapp({ version: 4 }) } });
        const title = await screen.findByRole("heading", { name: "Acme Wallet", level: 1 });

        await userEvent.click(screen.getByRole("button", { name: "Edit" }));
        expect(title).toHaveFocus();
        await userEvent.click(screen.getByRole("button", { name: "Cancel" }));
        expect(title).toHaveFocus();
        await userEvent.click(screen.getByRole("button", { name: "Edit" }));
        await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

        expect(await screen.findByRole("button", { name: "Edit" })).toBeInTheDocument();
        expect(title).toHaveFocus();
    });

    it("announces an action refused because the dApp changed, and moves focus to the title", async () => {
        renderDetail(adminDapp(), { [`GET ${PATH}/events`]: { body: [] }, [`POST ${PATH}/approve`]: apiError(409, "DAPP_CHANGED") });

        const dialog = await openDialog("Approve");
        await userEvent.click(within(dialog).getByRole("button", { name: "Approve and provision" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Nothing was doneThis dApp changed since you opened that dialog. Review its latest version below, then decide again.",
        );
        expect(screen.getByRole("heading", { name: "Acme Wallet", level: 1 })).toHaveFocus();
    });

    const PENDING_WITH_CHANGE = adminDapp({ status: "approved", auth0ClientId: "client-abc", pendingChange: PENDING_CHANGE, version: 7 });
    const APPROVED = adminDapp({ status: "approved", auth0ClientId: "client-abc", version: 8 });

    it.each([
        ["approve", adminDapp(), "Approve", "approve", "Approve and provision", adminDapp({ status: "approved", version: 4 }), "", ""],
        [
            "reject",
            adminDapp(),
            "Reject",
            "reject",
            "Reject and notify",
            adminDapp({ status: "rejected", rejectionReason: REASON, version: 4 }),
            REASON,
            "",
        ],
        ["change approval", PENDING_WITH_CHANGE, "Approve change", "change/approve", "Approve change", APPROVED, "", ""],
        ["change rejection", PENDING_WITH_CHANGE, "Reject change", "change/reject", "Reject change", APPROVED, REASON, ""],
        [
            "remove",
            adminDapp(),
            "Remove dApp…",
            "remove",
            "Remove dApp",
            adminDapp({ status: "removed", removedAt: AT, version: 4 }),
            REASON,
            "Acme Wallet",
        ],
    ] as const)("moves focus to the title after a successful %s", async (_name, before, open, path, confirm, after, reason, typed) => {
        let current: AdminDapp = before;
        renderDetail(before, {
            [`GET ${PATH}`]: () => ({ body: current }),
            [`POST ${PATH}/${path}`]: () => {
                current = after;
                return { body: after };
            },
        });

        const dialog = await openDialog(open);
        if (reason) await userEvent.type(within(dialog).getByLabelText("Reason"), reason);
        if (typed) await userEvent.type(within(dialog).getByLabelText(`Type ${typed} to confirm`), typed);
        await userEvent.click(within(dialog).getByRole("button", { name: confirm }));

        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(screen.getByRole("heading", { name: "Acme Wallet", level: 1 })).toHaveFocus();
    });

    it("clears the warning that the dApp changed once the next save succeeds", async () => {
        const api = renderDetail(adminDapp(), {
            [`POST ${PATH}/approve`]: apiError(409, "DAPP_CHANGED"),
            [`PUT ${PATH}`]: { body: adminDapp({ name: "Acme Pay", version: 4 }) },
        });
        await userEvent.click(within(await openDialog("Approve")).getByRole("button", { name: "Approve and provision" }));
        expect(await screen.findByText("Nothing was done")).toBeInTheDocument();

        await userEvent.click(screen.getByRole("button", { name: "Edit" }));
        await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

        await waitFor(() => expect(api.sent(`PUT ${PATH}`)).toHaveLength(1));
        await waitFor(() => expect(screen.queryByText("Nothing was done")).not.toBeInTheDocument());
    });

    it("points an admin to the stored Auth0 error when Auth0 refuses, without sending them to the NEAR Auth team", async () => {
        renderDetail(adminDapp(), { [`POST ${PATH}/approve`]: apiError(422, "PROVISIONING_REJECTED") });

        const dialog = await openDialog("Approve");
        await userEvent.click(within(dialog).getByRole("button", { name: "Approve and provision" }));

        expect(await within(dialog).findByRole("alert")).toHaveTextContent(
            "Not doneAuth0, or the console's check of the client's tag, refused this, so the console saved nothing. Its error is shown under \"The last Auth0 call failed\".",
        );
    });

    it("points an admin to the stored Auth0 error when the console could not finish in Auth0", async () => {
        renderDetail(adminDapp(), { [`POST ${PATH}/approve`]: apiError(502, "PROVISIONING_FAILED") });

        const dialog = await openDialog("Approve");
        await userEvent.click(within(dialog).getByRole("button", { name: "Approve and provision" }));

        expect(await within(dialog).findByRole("alert")).toHaveTextContent(
            'Not doneThe console could not finish this in Auth0, so it saved nothing, though Auth0 may already hold part of it. Try again in a few minutes; the error is shown under "The last Auth0 call failed".',
        );
    });

    it("shows the admin wording, not the owner's, when saving an edit is refused by Auth0", async () => {
        renderDetail(adminDapp(), { [`PUT ${PATH}`]: apiError(422, "PROVISIONING_REJECTED") });

        await userEvent.click(await screen.findByRole("button", { name: "Edit" }));
        await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

        expect(await screen.findByRole("alert")).toHaveTextContent(
            "Not savedAuth0, or the console's check of the client's tag, refused this, so the console saved nothing. Its error is shown under \"The last Auth0 call failed\".",
        );
    });

    it("goes back to the list it was opened from, with its view, search, page and sort", async () => {
        mockApi({
            "GET /api/console/admin/dapps": { body: { items: [adminDapp()], total: 45, page: 2, pageSize: 20 } },
            "GET /api/console/admin/settings": { body: { autoApproval: { enabled: false } } },
            [`GET ${PATH}`]: { body: adminDapp() },
            [`GET ${PATH}/events`]: { body: [] },
        });
        const router = renderApp(
            [
                { path: "/admin/dapps", element: <DappsList /> },
                { path: "/admin/dapps/:id", element: <DappDetail /> },
            ],
            "/admin/dapps?view=pending&q=acme&page=2&orderBy=name&order=desc",
        );

        await userEvent.click(await screen.findByRole("link", { name: "Acme Wallet" }));
        const breadcrumb = await screen.findByRole("navigation", { name: "Breadcrumb" });
        await userEvent.click(within(breadcrumb).getByRole("link", { name: "dApps" }));

        expect(await screen.findByRole("searchbox", { name: "Search dApps" })).toHaveValue("acme");
        expect(screen.getByRole("button", { name: "Pending" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByLabelText("Sort by")).toHaveDisplayValue("Name");
        expect(screen.getByLabelText("Order")).toHaveDisplayValue("Descending");
        expect(router.state.location.search).toBe("?view=pending&q=acme&page=2&orderBy=name&order=desc");
    });

    it("says when the dApp does not exist", async () => {
        mockApi({ [`GET ${PATH}`]: apiError(404, "DAPP_NOT_FOUND") });
        renderApp([{ path: "/admin/dapps/:id", element: <DappDetail /> }], `/admin/dapps/${ID}`);

        expect(await screen.findByRole("heading", { name: "dApp not found" })).toBeInTheDocument();
    });
});
