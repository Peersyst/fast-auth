import userEvent from "@testing-library/user-event";
import { AdminDappMock } from "@shared/console/test/mocks/admin";
import { formatDateTime } from "../../../../../../src/modules/common/utils/format";
import { DappsListScreen } from "../../../../../../src/modules/admin/screens/dapps-list/dapps-list.screen";
import { act, apiError, mockApi, MockRoutes, refocus, renderRoutes, screen, SentRequest, waitFor, within } from "../../../../../utils";

const LIST = "GET /api/console/admin/dapps";
const SETTINGS = { body: { autoApproval: { enabled: false, dailyCap: 10 } } };
const pendingChange = {
    name: "Acme Pay",
    description: "",
    logoUrl: "https://cdn.acme.xyz/pay.png",
    callbackUrls: ["https://app.acme.xyz/callback"],
    logoutUrls: [],
    webOrigins: ["https://app.acme.xyz"],
};

const ONE_DAPP = { body: { items: [new AdminDappMock()], totalItems: 1, currentPage: 1, pages: 1 } };
const EMPTY = { body: { items: [], totalItems: 0, currentPage: 1, pages: 0 } };

/**
 * Renders the list with the console answering from the given routes.
 * @param routes Answers that replace the default ones.
 * @returns The requests sent.
 */
function renderList(routes: MockRoutes = {}): ReturnType<typeof mockApi> {
    const items = [
        new AdminDappMock(),
        new AdminDappMock({ id: "a2", name: "Beta", status: "approved", pendingChange, pendingChangeAt: "2026-10-15T10:00:00.000Z" }),
    ];
    const api = mockApi({
        [LIST]: { body: { items, totalItems: 45, currentPage: 1, pages: 3 } },
        "GET /api/console/admin/settings": SETTINGS,
        ...routes,
    });
    renderRoutes([{ path: "/admin/dapps", element: <DappsListScreen /> }], "/admin/dapps");
    return api;
}

/**
 * Reads the query of the last request.
 * @param requests The requests.
 * @returns The query's parameters.
 */
function lastQuery(requests: SentRequest[]): Record<string, string> {
    return Object.fromEntries(requests.at(-1)?.query ?? []);
}

describe("DappsListScreen", () => {
    it("should show the review queue first, with a badge on rows with a pending change", async () => {
        const api = renderList();

        const beta = (await screen.findByRole("link", { name: "Beta" })).closest("tr")!;
        expect(within(beta).getByText("Change under review")).toBeInTheDocument();
        expect(lastQuery(api.sent(LIST))).toEqual({ needsReview: "true", page: "1", pageSize: "20", order: "ASC" });
        expect(screen.getByRole("button", { name: "Needs review" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByText("Showing 2 of 45 dApps · page 1 of 3")).toBeInTheDocument();
    });

    it("should ask for the review queue oldest-waiting first and show the waiting-since date", async () => {
        const api = renderList();
        await screen.findByRole("link", { name: "Beta" });

        expect(screen.getByLabelText("Sort by")).toHaveDisplayValue("Waiting since");
        expect(screen.getByLabelText("Order")).toHaveDisplayValue("Oldest first");
        expect(lastQuery(api.sent(LIST))).toEqual({ needsReview: "true", page: "1", pageSize: "20", order: "ASC" });
        expect(screen.getByRole("columnheader", { name: "Waiting since" })).toBeInTheDocument();
        const [acme, beta] = screen.getAllByRole("row").slice(1);
        expect(acme).toHaveTextContent(formatDateTime("2026-10-01T10:00:00.000Z"));
        expect(beta).toHaveTextContent(formatDateTime("2026-10-15T10:00:00.000Z"));
    });

    it("should show the date the list is sorted by", async () => {
        const user = userEvent.setup();
        renderList();
        await screen.findByRole("link", { name: "Beta" });

        await user.selectOptions(screen.getByLabelText("Sort by"), "Last updated");

        expect(await screen.findByRole("columnheader", { name: "Last updated" })).toBeInTheDocument();
        expect(screen.getAllByRole("row")[1]).toHaveTextContent(formatDateTime("2026-10-02T10:00:00.000Z"));

        await user.selectOptions(screen.getByLabelText("Sort by"), "Name");

        expect(await screen.findByRole("columnheader", { name: "Submitted" })).toBeInTheDocument();
        expect(screen.getAllByRole("row")[2]).toHaveTextContent(formatDateTime("2026-10-01T10:00:00.000Z"));
    });

    it("should ask for newest first when the review queue order is changed", async () => {
        const user = userEvent.setup();
        const api = renderList();
        await screen.findByRole("link", { name: "Beta" });

        await user.selectOptions(screen.getByLabelText("Order"), "Newest first");

        expect(screen.getByLabelText("Sort by")).toHaveDisplayValue("Waiting since");
        expect(screen.getByLabelText("Order")).toHaveDisplayValue("Newest first");
        expect(lastQuery(api.sent(LIST))).toEqual({ needsReview: "true", page: "1", pageSize: "20", order: "DESC" });
    });

    it("should show an erased owner as Erased and any other owner by email", async () => {
        renderList({
            [LIST]: {
                body: {
                    items: [
                        new AdminDappMock({ ownerEmail: "erased" }),
                        new AdminDappMock({ id: "a2", name: "Beta", ownerEmail: "ada@acme.xyz" }),
                    ],
                    totalItems: 2,
                    currentPage: 1,
                    pages: 1,
                },
            },
        });

        const acme = (await screen.findByRole("link", { name: "Acme Wallet" })).closest("tr")!;
        expect(within(acme).getByText("Erased")).toBeInTheDocument();
        expect(within(acme).queryByText("erased")).not.toBeInTheDocument();
        const beta = screen.getByRole("link", { name: "Beta" }).closest("tr")!;
        expect(within(beta).getByText("ada@acme.xyz")).toBeInTheDocument();
        expect(within(beta).queryByText("Erased")).not.toBeInTheDocument();
    });

    it("should filter by status, search, sort and page", async () => {
        const user = userEvent.setup();
        const api = renderList();
        await screen.findByRole("link", { name: "Beta" });

        await user.click(screen.getByRole("button", { name: "Removed" }));
        await user.type(screen.getByRole("searchbox", { name: "Search dApps" }), "acme{Enter}");
        await user.selectOptions(screen.getByLabelText("Sort by"), "Name");
        await user.selectOptions(screen.getByLabelText("Order"), "Descending");
        await user.click(screen.getByRole("button", { name: "Next" }));

        expect(lastQuery(api.sent(LIST))).toEqual({
            needsReview: "false",
            status: "removed",
            q: "acme",
            orderBy: "name",
            order: "DESC",
            page: "2",
            pageSize: "20",
        });
    });

    it("should search every dApp when the search starts from the review queue", async () => {
        const user = userEvent.setup();
        const api = renderList();
        await screen.findByRole("link", { name: "Beta" });

        await user.type(screen.getByRole("searchbox", { name: "Search dApps" }), "client-abc{Enter}");

        await waitFor(() =>
            expect(lastQuery(api.sent(LIST))).toEqual({ needsReview: "false", q: "client-abc", page: "1", pageSize: "20", order: "ASC" }),
        );
        expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    });

    it("should keep focus in the search box after a search", async () => {
        const user = userEvent.setup();
        renderList();
        await screen.findByRole("link", { name: "Beta" });

        await user.type(screen.getByRole("searchbox", { name: "Search dApps" }), "acme{Enter}");

        await waitFor(() => expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true"));
        expect(screen.getByRole("searchbox", { name: "Search dApps" })).toHaveFocus();
    });

    it("should show the URL's search in the search box after Back", async () => {
        const user = userEvent.setup();
        const api = mockApi({ [LIST]: ONE_DAPP, "GET /api/console/admin/settings": SETTINGS });
        const router = renderRoutes([{ path: "/admin/dapps", element: <DappsListScreen /> }], "/admin/dapps?view=all&q=old");
        const box = await screen.findByRole("searchbox", { name: "Search dApps" });
        expect(box).toHaveValue("old");

        await user.clear(box);
        await user.type(box, "  new  {Enter}");
        await waitFor(() => expect(lastQuery(api.sent(LIST)).q).toBe("new"));
        expect(screen.getByRole("searchbox", { name: "Search dApps" })).toHaveValue("new");
        await act(() => router.navigate(-1));

        await waitFor(() => expect(lastQuery(api.sent(LIST)).q).toBe("old"));
        expect(screen.getByRole("searchbox", { name: "Search dApps" })).toHaveValue("old");
    });

    it("should say when nothing needs review", async () => {
        renderList({ [LIST]: EMPTY });

        await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Nothing needs review."));
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("should announce the new result count, or that nothing matches, after a filter", async () => {
        const user = userEvent.setup();
        renderList({ [LIST]: (request) => (request.query.get("status") === "removed" ? EMPTY : ONE_DAPP) });
        await screen.findByRole("link", { name: "Acme Wallet" });
        const status = screen.getByRole("status");
        expect(status).toHaveTextContent("Showing 1 of 1 dApp · page 1 of 1");

        await user.click(screen.getByRole("button", { name: "Removed" }));
        await waitFor(() => expect(status).toHaveTextContent("No dApps match."));
        expect(screen.queryByRole("table")).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "All" }));
        await waitFor(() => expect(status).toHaveTextContent("Showing 1 of 1 dApp · page 1 of 1"));
    });

    it("should keep announcing the shown page while the next one loads", async () => {
        const user = userEvent.setup();
        let release = (): void => {};
        renderList({
            [LIST]: (request) =>
                request.query.get("page") === "2"
                    ? new Promise((resolve) => {
                          release = () =>
                              resolve({
                                  body: {
                                      items: [new AdminDappMock({ id: "a3", name: "Gamma" })],
                                      totalItems: 45,
                                      currentPage: 2,
                                      pages: 3,
                                  },
                              });
                      })
                    : { body: { items: [new AdminDappMock()], totalItems: 45, currentPage: 1, pages: 3 } },
        });
        await screen.findByRole("link", { name: "Acme Wallet" });
        const status = screen.getByRole("status");

        await user.click(screen.getByRole("button", { name: "Next" }));

        await waitFor(() => expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true"));
        expect(status).toHaveTextContent("Showing 1 of 45 dApps · page 1 of 3");
        release();
        await screen.findByRole("link", { name: "Gamma" });
        expect(status).toHaveTextContent("Showing 1 of 45 dApps · page 2 of 3");
    });

    it("should keep the empty text while another view loads", async () => {
        const user = userEvent.setup();
        const api = renderList({ [LIST]: (request) => (request.query.get("status") === "removed" ? new Promise(() => {}) : EMPTY) });
        const status = await screen.findByText("Nothing needs review.");

        await user.click(screen.getByRole("button", { name: "Removed" }));

        await waitFor(() => expect(lastQuery(api.sent(LIST))).toMatchObject({ status: "removed" }));
        expect(status).toHaveTextContent("Nothing needs review.");
    });

    it("should say when the list could not be loaded, and load it on Try again", async () => {
        const user = userEvent.setup();
        let fail = true;
        renderList({ [LIST]: () => (fail ? apiError(429, "RATE_LIMITED") : ONE_DAPP) });

        expect(await screen.findByRole("alert")).toHaveTextContent("The dApps could not be loadedToo many changes in a short time.");
        fail = false;
        await user.click(screen.getByRole("button", { name: "Try again" }));

        expect(await screen.findByRole("link", { name: "Acme Wallet" })).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("should keep the loaded list and warn that it may be out of date when a refresh fails", async () => {
        let fail = false;
        renderList({ [LIST]: () => (fail ? apiError(429, "RATE_LIMITED") : ONE_DAPP) });
        await screen.findByRole("link", { name: "Acme Wallet" });

        fail = true;
        refocus();

        expect(await screen.findByText("Could not refresh, so this may be out of date")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Acme Wallet" })).toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent("Showing 1 of 1 dApp · page 1 of 1");
    });

    it("should step back from a page past the end", async () => {
        const api = mockApi({
            [LIST]: (request) => {
                const page = Number(request.query.get("page"));
                return { body: { items: page > 1 ? [] : [new AdminDappMock()], totalItems: 20, currentPage: page, pages: 1 } };
            },
            "GET /api/console/admin/settings": SETTINGS,
        });
        renderRoutes([{ path: "/admin/dapps", element: <DappsListScreen /> }], "/admin/dapps?page=3");

        expect(await screen.findByRole("link", { name: "Acme Wallet" })).toBeInTheDocument();
        expect(api.sent(LIST).map((request) => request.query.get("page"))).toEqual(["3", "1"]);
        expect(screen.getByText("Showing 1 of 20 dApps · page 1 of 1")).toBeInTheDocument();
        expect(screen.queryByText("Nothing needs review.")).not.toBeInTheDocument();
    });

    it("should clamp a page past the API's maximum", async () => {
        const api = mockApi({
            [LIST]: { body: { items: [new AdminDappMock()], totalItems: 1, currentPage: 10000, pages: 10000 } },
            "GET /api/console/admin/settings": SETTINGS,
        });
        renderRoutes([{ path: "/admin/dapps", element: <DappsListScreen /> }], "/admin/dapps?page=99999");

        await screen.findByRole("link", { name: "Acme Wallet" });
        expect(lastQuery(api.sent(LIST)).page).toBe("10000");
    });
});
