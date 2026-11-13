import userEvent from "@testing-library/user-event";
import { Link } from "react-router";
import { DAPP_ID_MOCK as DAPP_ID, DappChangeMock, DappMock } from "@shared/console/test/mocks/dapp";
import { DappDto } from "@shared/console";
import { DappDetailScreen } from "../../../../../../src/modules/admin/screens/dapp-detail/dapp-detail.screen";
import { DappsListScreen } from "../../../../../../src/modules/admin/screens/dapps-list/dapps-list.screen";
import { apiError, mockApi, MockRoutes, refocus, renderRoutes, screen, waitFor, within } from "../../../../../utils";

describe("DappDetailScreen", () => {
    const admin = { email: "admin@near.org", role: "admin", emailVerified: true } as const;
    const path = `/api/console/dapp/${DAPP_ID}`;

    const pendingChange = new DappChangeMock({
        name: "Acme Pay",
        logoUrl: "https://cdn.acme.xyz/pay.png",
        contactEmail: "ops@acme.xyz",
        mauBracket: "gt25k",
    });

    /**
     * Renders routes as the admin.
     * @param routes The routes.
     * @param start The path to start at.
     * @returns The router.
     */
    function renderApp(routes: Parameters<typeof renderRoutes>[0], start: string): ReturnType<typeof renderRoutes> {
        return renderRoutes(routes, start, admin);
    }

    /**
     * Renders the dApp's page with the console answering from the given routes.
     * @param dapp The dApp.
     * @param routes Answers that replace the default ones.
     * @returns The requests sent.
     */
    function renderDetail(dapp: DappDto, routes: MockRoutes = {}): ReturnType<typeof mockApi> {
        const api = mockApi({ [`GET ${path}`]: { body: dapp }, ...routes });
        renderApp([{ path: "/admin/dapps/:id", element: <DappDetailScreen /> }], `/admin/dapps/${DAPP_ID}`);
        return api;
    }

    /**
     * Clicks a button that opens a dialog.
     * @param name The button's name.
     * @returns The dialog.
     */
    async function openDialog(name: string): Promise<HTMLElement> {
        await userEvent.click(await screen.findByRole("button", { name }));
        return screen.getByRole("dialog");
    }

    it("should show the dApp, its logo, its owner and its URLs", async () => {
        renderDetail(new DappMock());

        expect(await screen.findByRole("heading", { name: "Acme Wallet" })).toBeInTheDocument();
        expect(screen.getByRole("img", { name: "Logo of Acme Wallet" })).toHaveAttribute("src", "https://cdn.acme.xyz/logo.png");
        expect(screen.getByRole("link", { name: "owner@acme.xyz" })).toHaveAttribute("href", "mailto:owner@acme.xyz");
        expect(screen.getByText("https://app.acme.xyz/callback")).toBeInTheDocument();
    });

    it("should approve the dApp", async () => {
        const api = renderDetail(new DappMock(), { [`POST ${path}/approve`]: { body: new DappMock({ status: "approved" }) } });

        const dialog = await openDialog("Approve");
        await userEvent.click(within(dialog).getByRole("button", { name: "Approve and provision" }));

        await waitFor(() => expect(api.sent(`POST ${path}/approve`)).toHaveLength(1));
    });

    it("should reject the dApp", async () => {
        const api = renderDetail(new DappMock(), { [`POST ${path}/reject`]: { body: new DappMock({ status: "rejected" }) } });

        const dialog = await openDialog("Reject");
        await userEvent.click(within(dialog).getByRole("button", { name: "Reject dApp" }));

        await waitFor(() => expect(api.sent(`POST ${path}/reject`)).toHaveLength(1));
    });

    it("should review a pending change from the fields it sets", async () => {
        const dapp = new DappMock({ status: "approved", auth0ClientId: "client-abc", pendingChange });
        const api = renderDetail(dapp, {
            [`POST ${path}/change/approve`]: { body: { ...dapp, pendingChange: null } },
            [`POST ${path}/change/reject`]: { body: { ...dapp, pendingChange: null } },
        });

        const review = await screen.findByRole("region", { name: "Change under review" });
        expect(within(review).getAllByRole("row")).toHaveLength(5);
        expect(within(review).getByRole("row", { name: /Name/ })).toHaveTextContent("Acme WalletAcme Pay");
        expect(within(review).getByRole("row", { name: /Contact/ })).toHaveTextContent("Contactdev@acme.xyzops@acme.xyz");
        expect(within(review).getByRole("row", { name: /Expected MAU/ })).toHaveTextContent("Expected MAU1,000 – 10,000More than 25,000");
        expect(within(review).getByRole("img", { name: "Proposed logo of Acme Pay" })).toHaveAttribute(
            "src",
            "https://cdn.acme.xyz/pay.png",
        );

        await userEvent.click(within(await openDialog("Approve change")).getByRole("button", { name: "Approve change" }));
        await waitFor(() => expect(api.sent(`POST ${path}/change/approve`)).toHaveLength(1));

        await userEvent.click(within(await openDialog("Reject change")).getByRole("button", { name: "Reject change" }));
        await waitFor(() => expect(api.sent(`POST ${path}/change/reject`)).toHaveLength(1));
    });

    it("should keep the dialog open while the action is in flight, then report a refusal in it", async () => {
        let answer: () => void = () => undefined;
        const gate = new Promise<void>((resolve) => (answer = resolve));
        renderDetail(new DappMock(), {
            [`POST ${path}/approve`]: async () => {
                await gate;
                return apiError(409, "INVALID_TRANSITION");
            },
        });

        const dialog = await openDialog("Approve");
        await userEvent.click(within(dialog).getByRole("button", { name: "Approve and provision" }));
        await userEvent.keyboard("{Escape}");
        await userEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));

        expect(screen.getByRole("dialog")).toBeInTheDocument();
        expect(within(dialog).getByRole("button", { name: "Cancel" })).toBeDisabled();
        answer();
        expect(await within(dialog).findByRole("alert")).toHaveTextContent(
            "Not doneThat action is not possible in the dApp's current state. Reload to see it.",
        );
    });

    it("should load the dApp again after an action is refused", async () => {
        const routes: MockRoutes = {
            [`GET ${path}`]: { body: new DappMock({ status: "approved", auth0ClientId: "client-abc", pendingChange }) },
            [`POST ${path}/change/approve`]: apiError(404, "DAPP_CHANGE_NOT_FOUND"),
        };
        const api = mockApi(routes);
        renderApp([{ path: "/admin/dapps/:id", element: <DappDetailScreen /> }], `/admin/dapps/${DAPP_ID}`);

        const dialog = await openDialog("Approve change");
        await userEvent.click(within(dialog).getByRole("button", { name: "Approve change" }));

        expect(await within(dialog).findByRole("alert")).toHaveTextContent(
            "Not doneThere is no change waiting for review any more. Reload to see the current state.",
        );
        await waitFor(() => expect(api.sent(`GET ${path}`)).toHaveLength(2));
    });

    it("should start each dApp's page afresh when moving between dApps that are already loaded", async () => {
        const other = "5b1c2d3e-0000-4000-8000-000000000002";
        mockApi({
            [`GET ${path}`]: { body: new DappMock() },
            [`GET /api/console/dapp/${other}`]: { body: new DappMock({ id: other, name: "Beta Bridge" }) },
        });
        renderApp(
            [
                {
                    path: "/admin/dapps/:id",
                    element: (
                        <>
                            <Link to={`/admin/dapps/${other}`}>Go to Beta Bridge</Link>
                            <Link to={`/admin/dapps/${DAPP_ID}`}>Go to Acme Wallet</Link>
                            <DappDetailScreen />
                        </>
                    ),
                },
            ],
            `/admin/dapps/${DAPP_ID}`,
        );
        await screen.findByRole("heading", { name: "Acme Wallet", level: 1 });
        await userEvent.click(screen.getByRole("link", { name: "Go to Beta Bridge" }));
        expect(await openDialog("Approve")).toHaveAccessibleName("Approve Beta Bridge?");

        await userEvent.click(screen.getByRole("link", { name: "Go to Acme Wallet" }));

        expect(await screen.findByRole("heading", { name: "Acme Wallet", level: 1 })).toBeInTheDocument();
        expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    });

    it("should keep the page when a background refetch fails", async () => {
        const routes: MockRoutes = { [`GET ${path}`]: { body: new DappMock() } };
        mockApi(routes);
        renderApp([{ path: "/admin/dapps/:id", element: <DappDetailScreen /> }], `/admin/dapps/${DAPP_ID}`);
        await screen.findByRole("heading", { name: "Acme Wallet", level: 1 });

        routes[`GET ${path}`] = apiError(500, "Internal server error");
        refocus();

        expect(await screen.findByText("Could not refresh, so this may be out of date")).toBeInTheDocument();
        expect(screen.getByRole("heading", { name: "Acme Wallet", level: 1 })).toBeInTheDocument();
    });

    it.each([
        ["pending", new DappMock(), ["Approve", "Reject"]],
        ["approved", new DappMock({ status: "approved", auth0ClientId: "abcDEF123" }), ["Copy"]],
        [
            "approved with a pending change",
            new DappMock({ status: "approved", auth0ClientId: "abcDEF123", pendingChange }),
            ["Approve change", "Reject change", "Copy"],
        ],
        ["rejected", new DappMock({ status: "rejected" }), []],
        ["removed", new DappMock({ status: "removed", auth0ClientId: "abcDEF123" }), []],
    ])("should offer only the actions a %s dApp allows", async (_status, dapp, buttons) => {
        renderDetail(dapp);

        await screen.findByRole("heading", { name: "Acme Wallet", level: 1 });

        expect(screen.queryAllByRole("button").map((button) => button.textContent)).toEqual(buttons);
    });

    it("should show a removed dApp's Auth0 client as its former one, with nothing to copy", async () => {
        renderDetail(new DappMock({ status: "removed", auth0ClientId: "abcDEF123" }));

        await screen.findByRole("heading", { name: "Acme Wallet", level: 1 });

        expect(screen.getByText("Former client ID").nextElementSibling).toHaveTextContent("abcDEF123");
        expect(screen.queryByText("Client ID")).not.toBeInTheDocument();
        expect(screen.queryByRole("button", { name: "Copy client ID" })).not.toBeInTheDocument();
    });

    it.each([
        ["approve", new DappMock(), "Approve", "approve", "Approve and provision", new DappMock({ status: "approved" })],
        ["reject", new DappMock(), "Reject", "reject", "Reject dApp", new DappMock({ status: "rejected" })],
        [
            "change approval",
            new DappMock({ status: "approved", auth0ClientId: "client-abc", pendingChange }),
            "Approve change",
            "change/approve",
            "Approve change",
            new DappMock({ status: "approved", auth0ClientId: "client-abc" }),
        ],
        [
            "change rejection",
            new DappMock({ status: "approved", auth0ClientId: "client-abc", pendingChange }),
            "Reject change",
            "change/reject",
            "Reject change",
            new DappMock({ status: "approved", auth0ClientId: "client-abc" }),
        ],
    ] as const)("should move focus to the title after a successful %s", async (_name, before, open, action, confirm, after) => {
        let current: DappDto = before;
        renderDetail(before, {
            [`GET ${path}`]: () => ({ body: current }),
            [`POST ${path}/${action}`]: () => {
                current = after;
                return { body: after };
            },
        });

        const dialog = await openDialog(open);
        await userEvent.click(within(dialog).getByRole("button", { name: confirm }));

        await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
        expect(screen.getByRole("heading", { name: "Acme Wallet", level: 1 })).toHaveFocus();
    });

    it("should go back to the page of the list it was opened from", async () => {
        mockApi({
            "GET /api/console/dapp": { body: { items: [new DappMock()], totalItems: 45, currentPage: 2, pages: 3 } },
            [`GET ${path}`]: { body: new DappMock() },
        });
        const router = renderApp(
            [
                { path: "/admin/dapps", element: <DappsListScreen /> },
                { path: "/admin/dapps/:id", element: <DappDetailScreen /> },
            ],
            "/admin/dapps?page=2",
        );

        await userEvent.click(await screen.findByRole("link", { name: "Acme Wallet" }));
        const breadcrumb = await screen.findByRole("navigation", { name: "Breadcrumb" });
        await userEvent.click(within(breadcrumb).getByRole("link", { name: "dApps" }));

        expect(await screen.findByText("Showing 1 of 45 dApps · page 2 of 3")).toBeInTheDocument();
        expect(router.state.location.search).toBe("?page=2");
    });

    it("should say when the dApp does not exist", async () => {
        mockApi({ [`GET ${path}`]: apiError(404, "DAPP_NOT_FOUND") });
        renderApp([{ path: "/admin/dapps/:id", element: <DappDetailScreen /> }], `/admin/dapps/${DAPP_ID}`);

        expect(await screen.findByRole("heading", { name: "dApp not found" })).toBeInTheDocument();
    });
});
