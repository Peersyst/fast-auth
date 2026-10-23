import { ConsoleApi, expectError, expectStatus, NO_EFFECTS } from "./utils/console-api";
import type { AdminDapp } from "./utils/contract";
import { createTestApp } from "./utils/test-app";

const LOCK_TIMEOUT_MS = 500;

describe("lock timeout (DB_LOCK_TIMEOUT_MS)", () => {
    const api = new ConsoleApi();

    beforeAll(async () => {
        const previous = process.env.DB_LOCK_TIMEOUT_MS;
        process.env.DB_LOCK_TIMEOUT_MS = String(LOCK_TIMEOUT_MS);
        try {
            api.app = await createTestApp();
        } finally {
            if (previous === undefined) delete process.env.DB_LOCK_TIMEOUT_MS;
            else process.env.DB_LOCK_TIMEOUT_MS = previous;
        }
    });

    beforeEach(async () => {
        await api.reset();
    });

    afterAll(async () => {
        await api.app.close();
    });

    it("a request waiting longer than lock_timeout for the row answers 409 DAPP_CHANGED and writes nothing", async () => {
        const dapp = await api.submitDapp(await api.user());
        const checkpoint = await api.checkpoint(dapp.id);
        await api.withOpenTransaction(async (runner) => {
            await runner.query("SELECT id FROM dapps WHERE id = $1 FOR UPDATE", [dapp.id]);
            const started = performance.now();

            expectError(await api.approve(dapp.id, dapp.version), 409, "DAPP_CHANGED");

            const waited = performance.now() - started;
            expect(waited).toBeGreaterThanOrEqual(LOCK_TIMEOUT_MS);
        });
        expect(await checkpoint.effects()).toEqual(NO_EFFECTS);
        expect(await api.adminDapp(dapp.id)).toMatchObject({ status: "pending", version: dapp.version });

        expect(expectStatus<AdminDapp>(await api.approve(dapp.id, dapp.version), 200)).toMatchObject({ status: "approved" });
    });
});
