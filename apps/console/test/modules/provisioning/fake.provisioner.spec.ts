import { Test } from "@nestjs/testing";
import type { DappId, SyncedFields } from "@shared/console-domain/dapp";
import { FakeProvisioner } from "../../../src/modules/provisioning/fake.provisioner";

const DAPP_ID = "11111111-1111-4111-8111-111111111111" as DappId;
const input: SyncedFields = {
    name: "Example",
    description: "",
    logoUrl: "https://example.com/logo.png",
    callbackUrls: ["https://example.com/callback"],
    logoutUrls: [],
    webOrigins: [],
};

/**
 * Builds a fake provisioner through its own Nest testing module.
 * @returns The provisioner.
 */
async function createFakeProvisioner(): Promise<FakeProvisioner> {
    const module = await Test.createTestingModule({ providers: [FakeProvisioner] }).compile();
    return module.get(FakeProvisioner);
}

describe("FakeProvisioner", () => {
    describe("createClient", () => {
        it("should hand out client ids that differ between processes", async () => {
            const seed = await createFakeProvisioner();
            const api = await createFakeProvisioner();
            expect(await seed.createClient(DAPP_ID, input)).not.toBe(await api.createClient(DAPP_ID, input));
        });
    });
});
