import type { DappId, SyncedFields } from "../../domain/dapp";
import { FakeProvisioner } from "./fake.provisioner";

const DAPP_ID = "11111111-1111-4111-8111-111111111111" as DappId;
const input: SyncedFields = {
    name: "Example",
    description: "",
    logoUrl: "https://example.com/logo.png",
    callbackUrls: ["https://example.com/callback"],
    logoutUrls: [],
    webOrigins: [],
};

describe("FakeProvisioner", () => {
    it("hands out client ids that differ between processes", async () => {
        const seed = new FakeProvisioner();
        const api = new FakeProvisioner();
        expect(await seed.createClient(DAPP_ID, input)).not.toBe(await api.createClient(DAPP_ID, input));
    });
});
