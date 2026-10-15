import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { adminDapp, apiError, mockApi, refocus, renderApp, type MockRoutes, type SentRequest } from "../../test/api";
import { formatDateTime } from "../../lib/format";
import { DappsList } from "./DappsList";

const LIST = "GET /api/console/admin/dapps";
const pendingChange = {
    name: "Acme Pay",
    description: "",
    logoUrl: "https://cdn.acme.xyz/pay.png",
    callbackUrls: ["https://app.acme.xyz/callback"],
    logoutUrls: [],
    webOrigins: ["https://app.acme.xyz"],
};

const ONE_DAPP = { body: { items: [adminDapp()], total: 1, page: 1, pageSize: 20 } };

function renderList(routes: MockRoutes = {}) {
    const items = [
        adminDapp(),
        adminDapp({
            id: "a2",
            name: "Beta",
            status: "approved",
            pendingChange,
            pendingChangeAt: "2026-10-15T10:00:00.000Z",
        }),
    ];
    const api = mockApi({
        [LIST]: { body: { items, total: 45, page: 1, pageSize: 20 } },
        "GET /api/console/admin/settings": { body: { autoApproval: { enabled: false } } },
        ...routes,
    });
    renderApp([{ path: "/admin/dapps", element: <DappsList /> }], "/admin/dapps");
    return api;
}

function lastQuery(requests: SentRequest[]) {
    return Object.fromEntries(requests.at(-1)?.query ?? []);
}

describe("DappsList", () => {
    it("shows the review queue first, with a badge on rows with a pending change", async () => {
        const api = renderList();

        const beta = (await screen.findByRole("link", { name: "Beta" })).closest("tr")!;
        expect(within(beta).getByText("Change under review")).toBeInTheDocument();
        expect(lastQuery(api.sent(LIST))).toEqual({ needsReview: "true", page: "1", order: "asc" });
        expect(screen.getByRole("button", { name: "Needs review" })).toHaveAttribute("aria-pressed", "true");
        expect(screen.getByText("Showing 2 of 45 dApps · page 1 of 3")).toBeInTheDocument();
    });

    it("asks for the review queue oldest-waiting first and shows the waiting-since date", async () => {
        const api = renderList();
        await screen.findByRole("link", { name: "Beta" });

        expect(screen.getByLabelText("Sort by")).toHaveDisplayValue("Waiting since");
        expect(screen.getByLabelText("Order")).toHaveDisplayValue("Oldest first");
        expect(lastQuery(api.sent(LIST))).toEqual({ needsReview: "true", page: "1", order: "asc" });
        expect(screen.getByRole("columnheader", { name: "Waiting since" })).toBeInTheDocument();
        const [acme, beta] = screen.getAllByRole("row").slice(1);
        expect(acme).toHaveTextContent(formatDateTime("2026-10-01T10:00:00.000Z"));
        expect(beta).toHaveTextContent(formatDateTime("2026-10-15T10:00:00.000Z"));
    });

    it("shows the date the list is sorted by", async () => {
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

    it("asks for newest first when the review queue order is changed", async () => {
        const user = userEvent.setup();
        const api = renderList();
        await screen.findByRole("link", { name: "Beta" });

        await user.selectOptions(screen.getByLabelText("Order"), "Newest first");

        expect(screen.getByLabelText("Sort by")).toHaveDisplayValue("Waiting since");
        expect(screen.getByLabelText("Order")).toHaveDisplayValue("Newest first");
        expect(lastQuery(api.sent(LIST))).toEqual({ needsReview: "true", page: "1", order: "desc" });
    });

    it("shows an erased owner as Erased and any other owner by email", async () => {
        renderList({
            [LIST]: {
                body: {
                    items: [adminDapp({ ownerEmail: "erased" }), adminDapp({ id: "a2", name: "Beta", ownerEmail: "ada@acme.xyz" })],
                    total: 2,
                    page: 1,
                    pageSize: 20,
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

    it("filters by status, searches, sorts and pages", async () => {
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
            order: "desc",
            page: "2",
        });
    });

    it("searches every dApp when the search starts from the review queue", async () => {
        const user = userEvent.setup();
        const api = renderList();
        await screen.findByRole("link", { name: "Beta" });

        await user.type(screen.getByRole("searchbox", { name: "Search dApps" }), "client-abc{Enter}");

        await waitFor(() => expect(lastQuery(api.sent(LIST))).toEqual({ needsReview: "false", q: "client-abc", page: "1", order: "asc" }));
        expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
    });

    it("keeps focus in the search box after a search", async () => {
        const user = userEvent.setup();
        renderList();
        await screen.findByRole("link", { name: "Beta" });

        await user.type(screen.getByRole("searchbox", { name: "Search dApps" }), "acme{Enter}");

        await waitFor(() => expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true"));
        expect(screen.getByRole("searchbox", { name: "Search dApps" })).toHaveFocus();
    });

    it("shows the URL's search in the search box after Back", async () => {
        const user = userEvent.setup();
        const api = mockApi({
            [LIST]: ONE_DAPP,
            "GET /api/console/admin/settings": { body: { autoApproval: { enabled: false } } },
        });
        const router = renderApp([{ path: "/admin/dapps", element: <DappsList /> }], "/admin/dapps?view=all&q=old");
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

    it("says when nothing needs review", async () => {
        renderList({ [LIST]: { body: { items: [], total: 0, page: 1, pageSize: 20 } } });

        await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Nothing needs review."));
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("announces the new result count, or that nothing matches, after a filter", async () => {
        const user = userEvent.setup();
        renderList({
            [LIST]: (request) =>
                request.query.get("status") === "removed" ? { body: { items: [], total: 0, page: 1, pageSize: 20 } } : ONE_DAPP,
        });
        await screen.findByRole("link", { name: "Acme Wallet" });
        const status = screen.getByRole("status");
        expect(status).toHaveTextContent("Showing 1 of 1 dApp · page 1 of 1");

        await user.click(screen.getByRole("button", { name: "Removed" }));
        await waitFor(() => expect(status).toHaveTextContent("No dApps match."));
        expect(screen.queryByRole("table")).not.toBeInTheDocument();

        await user.click(screen.getByRole("button", { name: "All" }));
        await waitFor(() => expect(status).toHaveTextContent("Showing 1 of 1 dApp · page 1 of 1"));
    });

    it("keeps announcing the shown page while the next one loads", async () => {
        const user = userEvent.setup();
        let release = () => {};
        renderList({
            [LIST]: (request) =>
                request.query.get("page") === "2"
                    ? new Promise((resolve) => {
                          release = () =>
                              resolve({ body: { items: [adminDapp({ id: "a3", name: "Gamma" })], total: 45, page: 2, pageSize: 20 } });
                      })
                    : { body: { items: [adminDapp()], total: 45, page: 1, pageSize: 20 } },
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

    it("keeps the empty text while another view loads", async () => {
        const user = userEvent.setup();
        const empty = { body: { items: [], total: 0, page: 1, pageSize: 20 } };
        const api = renderList({ [LIST]: (request) => (request.query.get("status") === "removed" ? new Promise(() => {}) : empty) });
        const status = await screen.findByText("Nothing needs review.");

        await user.click(screen.getByRole("button", { name: "Removed" }));

        await waitFor(() => expect(lastQuery(api.sent(LIST))).toMatchObject({ status: "removed" }));
        expect(status).toHaveTextContent("Nothing needs review.");
    });

    it("says when the list could not be loaded, and loads it on Try again", async () => {
        const user = userEvent.setup();
        let fail = true;
        renderList({ [LIST]: () => (fail ? apiError(429, "RATE_LIMITED") : ONE_DAPP) });

        expect(await screen.findByRole("alert")).toHaveTextContent("The dApps could not be loadedToo many changes in a short time.");
        fail = false;
        await user.click(screen.getByRole("button", { name: "Try again" }));

        expect(await screen.findByRole("link", { name: "Acme Wallet" })).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("keeps the loaded list and warns that it may be out of date when a refresh fails", async () => {
        let fail = false;
        renderList({ [LIST]: () => (fail ? apiError(429, "RATE_LIMITED") : ONE_DAPP) });
        await screen.findByRole("link", { name: "Acme Wallet" });

        fail = true;
        refocus();

        expect(await screen.findByText("Could not refresh, so this may be out of date")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Acme Wallet" })).toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent("Showing 1 of 1 dApp · page 1 of 1");
    });

    it("steps back from a page past the end", async () => {
        const api = mockApi({
            [LIST]: (request) => {
                const page = Number(request.query.get("page"));
                return { body: { items: page > 1 ? [] : [adminDapp()], total: 20, page, pageSize: 20 } };
            },
            "GET /api/console/admin/settings": { body: { autoApproval: { enabled: false } } },
        });
        renderApp([{ path: "/admin/dapps", element: <DappsList /> }], "/admin/dapps?page=3");

        expect(await screen.findByRole("link", { name: "Acme Wallet" })).toBeInTheDocument();
        expect(api.sent(LIST).map((request) => request.query.get("page"))).toEqual(["3", "1"]);
        expect(screen.getByText("Showing 1 of 20 dApps · page 1 of 1")).toBeInTheDocument();
        expect(screen.queryByText("Nothing needs review.")).not.toBeInTheDocument();
    });

    it("clamps a page past the API's maximum", async () => {
        const api = mockApi({
            [LIST]: { body: { items: [adminDapp()], total: 1, page: 10000, pageSize: 20 } },
            "GET /api/console/admin/settings": { body: { autoApproval: { enabled: false } } },
        });
        renderApp([{ path: "/admin/dapps", element: <DappsList /> }], "/admin/dapps?page=99999");

        await screen.findByRole("link", { name: "Acme Wallet" });
        expect(lastQuery(api.sent(LIST)).page).toBe("10000");
    });
});
