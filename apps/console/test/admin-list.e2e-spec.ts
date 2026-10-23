import { dappForm, expectStatus, expectValidationFailed, REASON, useConsoleApi } from "./utils/console-api";
import type { DappFormFields, DappList } from "./utils/contract";

function zetaForm(overrides: Partial<DappFormFields> = {}): DappFormFields {
    return dappForm({
        name: "Zeta",
        description: "A dApp that matches nothing.",
        logoUrl: "https://zeta.io/logo.png",
        callbackUrls: ["https://zeta.io/callback"],
        logoutUrls: [],
        webOrigins: ["https://zeta.io"],
        contactEmail: "team@zeta.io",
        ...overrides,
    });
}

describe("GET /admin/dapps", () => {
    const api = useConsoleApi();

    const list = async (query: Record<string, string | number | boolean> = {}): Promise<DappList> =>
        expectStatus<DappList>(await api.list(query), 200);

    it("status=pending&q=acme&page=2&pageSize=2&orderBy=name&order=desc returns the second page", async () => {
        for (let n = 1; n <= 5; n += 1) await api.submitDapp(await api.user(), zetaForm({ name: `Acme ${n}` }));
        await api.submitDapp(await api.user(), zetaForm({ name: "Zeta 1" }));
        await api.approvedDapp(await api.user(), zetaForm({ name: "Acme 9" }));

        const second = await list({ status: "pending", q: "acme", page: 2, pageSize: 2, orderBy: "name", order: "desc" });
        const first = await list({ status: "pending", q: "acme", page: 1, pageSize: 2, orderBy: "name", order: "desc" });

        expect(second).toMatchObject({ total: 5, page: 2, pageSize: 2 });
        expect(second.items.map((dapp) => dapp.name)).toEqual(["Acme 3", "Acme 2"]);
        expect(first.items.map((dapp) => dapp.name)).toEqual(["Acme 5", "Acme 4"]);
    });

    it.each([
        ["submittedAt", [0, 1, 2, 3]],
        ["updatedAt", [1, 0, 2, 3]],
        ["name", [1, 3, 2, 0]],
        ["status", [1, 2, 0, 3]],
    ] as const)("orderBy=%s&order=asc sorts by that column alone", async (orderBy, expected) => {
        const bravoOwner = await api.user();
        const delta = await api.submitDapp(await api.user(), zetaForm({ name: "Delta" }));
        const alpha = await api.submitDapp(await api.user(), zetaForm({ name: "Alpha" }));
        const charlie = await api.submitDapp(await api.user(), zetaForm({ name: "Charlie" }));
        const bravo = await api.submitDapp(bravoOwner, zetaForm({ name: "Bravo" }));
        expectStatus(await api.reject(delta.id, delta.version), 200);
        expectStatus(await api.approve(charlie.id, charlie.version), 200);
        expectStatus(await api.removeOwn(bravoOwner, bravo.id, bravo.version), 204);
        const submitted = [delta, alpha, charlie, bravo];

        const sorted = await list({ orderBy, order: "asc" });

        expect(sorted.items.map((dapp) => dapp.id)).toEqual(expected.map((index) => submitted[index]?.id));
    });

    it("matches q against the name, the owner email, the contact email and the Auth0 client id, ignoring case", async () => {
        const byName = await api.submitDapp(await api.user(), zetaForm({ name: "Nebula Pay" }));
        const byOwner = await api.submitDapp(await api.user("ops@orbit-labs.xyz"), zetaForm());
        const byContact = await api.submitDapp(await api.user(), zetaForm({ contactEmail: "hello@quasar.io" }));
        const byClient = await api.approvedDapp(await api.user(), zetaForm());
        await api.submitDapp(await api.user(), zetaForm());
        const search = async (q: string): Promise<string[]> => (await list({ q })).items.map((dapp) => dapp.id);

        expect(await search("NEBULA")).toEqual([byName.id]);
        expect(await search("Orbit-Labs")).toEqual([byOwner.id]);
        expect(await search("QUASAR")).toEqual([byContact.id]);
        expect(await search(String(byClient.auth0ClientId).toUpperCase())).toEqual([byClient.id]);
    });

    it("status=removed lists the removed dApps, oldest submission first", async () => {
        const owner = await api.user();
        const removedByOwner = await api.submitDapp(owner, zetaForm());
        expectStatus(await api.removeOwn(owner, removedByOwner.id, removedByOwner.version), 204);
        const removedByAdmin = await api.approvedDapp(await api.user(), zetaForm());
        expectStatus(await api.adminRemove(removedByAdmin.id, removedByAdmin.version, REASON), 200);
        await api.submitDapp(await api.user(), zetaForm());

        const removed = await list({ status: "removed" });

        expect(removed).toMatchObject({ total: 2, page: 1, pageSize: 20 });
        expect(removed.items.map((dapp) => [dapp.id, dapp.status])).toEqual([
            [removedByOwner.id, "removed"],
            [removedByAdmin.id, "removed"],
        ]);
    });

    it("lists every dApp by default, oldest submission first", async () => {
        const pending = await api.submitDapp(await api.user(), zetaForm({ name: "Pending" }));
        const approved = await api.approvedDapp(await api.user(), zetaForm({ name: "Approved" }));
        const rejected = await api.rejectedDapp(await api.user(), zetaForm({ name: "Rejected" }));

        const all = await list();

        expect(all).toMatchObject({ total: 3, page: 1, pageSize: 20 });
        expect(all.items.map((dapp) => dapp.id)).toEqual([pending.id, approved.id, rejected.id]);
    });

    it("needsReview=true lists pending dApps and approved ones with a pending change, oldest first", async () => {
        const first = await api.submitDapp(await api.user(), zetaForm({ name: "First" }));
        const changeOwner = await api.user();
        const changed = await api.approvedDapp(changeOwner, zetaForm({ name: "Changed" }));
        await api.approvedDapp(await api.user(), zetaForm({ name: "Approved" }));
        const later = await api.submitDapp(await api.user(), zetaForm({ name: "Later" }));
        await api.rejectedDapp(await api.user(), zetaForm({ name: "Rejected" }));
        const removedOwner = await api.user();
        const removed = await api.submitDapp(removedOwner, zetaForm({ name: "Removed" }));
        expectStatus(await api.removeOwn(removedOwner, removed.id, removed.version), 204);
        await api.requestChange(changeOwner, changed, { name: "Changed 2" });

        const queue = await list({ needsReview: true });

        expect(queue).toMatchObject({ total: 3, page: 1, pageSize: 20 });
        expect(queue.items.map((dapp) => dapp.id)).toEqual([first.id, later.id, changed.id]);
        expect(queue.items[2]).toMatchObject({ status: "approved", pendingChange: { name: "Changed 2" } });
    });

    it("refuses pageSize over 100, unknown values and unknown query fields with 400 VALIDATION_FAILED", async () => {
        expect(await list({ pageSize: 100 })).toMatchObject({ pageSize: 100 });

        expectValidationFailed(await api.list({ pageSize: 101 }));
        expectValidationFailed(await api.list({ status: "archived" }));
        expectValidationFailed(await api.list({ orderBy: "ownerEmail" }));
        expectValidationFailed(await api.list({ sort: "name" }));
    });

    it("refuses a page past the 10000 cap, such as one whose OFFSET would overflow bigint", async () => {
        expectValidationFailed(await api.list({ page: "1000000000000000000" }));
        expect(await list({ page: 10_000 })).toMatchObject({ items: [], page: 10_000 });
    });
});
