import userEvent from "@testing-library/user-event";
import { DappChangeMock, DappMock } from "@shared/console/test/mocks/dapp";
import { formatDateTime } from "../../../../../../src/modules/common/utils/format";
import { DappsListScreen } from "../../../../../../src/modules/admin/screens/dapps-list/dapps-list.screen";
import { apiError, mockApi, MockRoutes, refocus, renderRoutes, screen, SentRequest, waitFor, within } from "../../../../../utils";

describe("DappsListScreen", () => {
    const list = "GET /api/console/dapp";

    const pendingChange = new DappChangeMock({ name: "Acme Pay", createdAt: "2026-10-15T10:00:00.000Z" });

    const oneDapp = { body: { items: [new DappMock()], totalItems: 1, currentPage: 1, pages: 1 } };
    const empty = { body: { items: [], totalItems: 0, currentPage: 1, pages: 0 } };

    /**
     * Renders the list with the console answering from the given routes.
     * @param routes Answers that replace the default ones.
     * @returns The requests sent.
     */
    function renderList(routes: MockRoutes = {}): ReturnType<typeof mockApi> {
        const items = [
            new DappMock(),
            new DappMock({ id: "a2", name: "Beta", status: "approved", pendingChange, createdAt: "2026-10-05T10:00:00.000Z" }),
        ];
        const api = mockApi({
            [list]: { body: { items, totalItems: 45, currentPage: 1, pages: 3 } },
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

    it("should list the first page of every dApp, with a badge on rows with a pending change", async () => {
        const api = renderList();

        const beta = (await screen.findByRole("link", { name: "Beta" })).closest("tr")!;
        expect(within(beta).getByText("Change under review")).toBeInTheDocument();
        expect(lastQuery(api.sent(list))).toEqual({ page: "1", pageSize: "20" });
        expect(screen.getByText("Showing 2 of 45 dApps · page 1 of 3")).toBeInTheDocument();
    });

    it("should show the date each dApp was submitted", async () => {
        renderList();
        await screen.findByRole("link", { name: "Beta" });

        expect(screen.getByRole("columnheader", { name: "Submitted" })).toBeInTheDocument();
        const [acme, beta] = screen.getAllByRole("row").slice(1);
        expect(acme).toHaveTextContent(formatDateTime("2026-10-01T10:00:00.000Z"));
        expect(beta).toHaveTextContent(formatDateTime("2026-10-05T10:00:00.000Z"));
    });

    it("should show each dApp's owner by email", async () => {
        renderList({
            [list]: {
                body: {
                    items: [new DappMock({ name: "Beta", ownerEmail: "ada@acme.xyz" })],
                    totalItems: 1,
                    currentPage: 1,
                    pages: 1,
                },
            },
        });

        const beta = (await screen.findByRole("link", { name: "Beta" })).closest("tr")!;
        expect(within(beta).getByText("ada@acme.xyz")).toBeInTheDocument();
    });

    it("should page through the dApps", async () => {
        const user = userEvent.setup();
        const api = renderList();
        await screen.findByRole("link", { name: "Beta" });

        await user.click(screen.getByRole("button", { name: "Next" }));

        await waitFor(() => expect(lastQuery(api.sent(list))).toEqual({ page: "2", pageSize: "20" }));
    });

    it("should say when there are no dApps", async () => {
        renderList({ [list]: empty });

        await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("No dApps yet."));
        expect(screen.queryByRole("table")).not.toBeInTheDocument();
    });

    it("should keep announcing the shown page while the next one loads", async () => {
        const user = userEvent.setup();
        let release = (): void => {};
        renderList({
            [list]: (request) =>
                request.query.get("page") === "2"
                    ? new Promise((resolve) => {
                          release = () =>
                              resolve({
                                  body: {
                                      items: [new DappMock({ id: "a3", name: "Gamma" })],
                                      totalItems: 45,
                                      currentPage: 2,
                                      pages: 3,
                                  },
                              });
                      })
                    : { body: { items: [new DappMock()], totalItems: 45, currentPage: 1, pages: 3 } },
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

    it("should say when the list could not be loaded, and load it on Try again", async () => {
        const user = userEvent.setup();
        let fail = true;
        renderList({ [list]: () => (fail ? apiError(500, "Internal server error") : oneDapp) });

        expect(await screen.findByRole("alert")).toHaveTextContent("The dApps could not be loadedSomething went wrong on our side.");
        fail = false;
        await user.click(screen.getByRole("button", { name: "Try again" }));

        expect(await screen.findByRole("link", { name: "Acme Wallet" })).toBeInTheDocument();
        expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    });

    it("should keep the loaded list and warn that it may be out of date when a refresh fails", async () => {
        let fail = false;
        renderList({ [list]: () => (fail ? apiError(500, "Internal server error") : oneDapp) });
        await screen.findByRole("link", { name: "Acme Wallet" });

        fail = true;
        refocus();

        expect(await screen.findByText("Could not refresh, so this may be out of date")).toBeInTheDocument();
        expect(screen.getByRole("link", { name: "Acme Wallet" })).toBeInTheDocument();
        expect(screen.getByRole("status")).toHaveTextContent("Showing 1 of 1 dApp · page 1 of 1");
    });

    it("should step back from a page past the end", async () => {
        const api = mockApi({
            [list]: (request) => {
                const page = Number(request.query.get("page"));
                return { body: { items: page > 1 ? [] : [new DappMock()], totalItems: 20, currentPage: page, pages: 1 } };
            },
        });
        renderRoutes([{ path: "/admin/dapps", element: <DappsListScreen /> }], "/admin/dapps?page=3");

        expect(await screen.findByRole("link", { name: "Acme Wallet" })).toBeInTheDocument();
        expect(api.sent(list).map((request) => request.query.get("page"))).toEqual(["3", "1"]);
        expect(screen.getByText("Showing 1 of 20 dApps · page 1 of 1")).toBeInTheDocument();
        expect(screen.queryByText("No dApps yet.")).not.toBeInTheDocument();
    });

    it("should clamp a page past the API's maximum", async () => {
        const api = mockApi({
            [list]: { body: { items: [new DappMock()], totalItems: 1, currentPage: 10000, pages: 10000 } },
        });
        renderRoutes([{ path: "/admin/dapps", element: <DappsListScreen /> }], "/admin/dapps?page=99999");

        await screen.findByRole("link", { name: "Acme Wallet" });
        expect(lastQuery(api.sent(list)).page).toBe("10000");
    });
});
