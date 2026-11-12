import { DappClient } from "../../../../../src/modules/provisioning/interfaces/i-auth0-provisioner.service";
import { FakeProvisionerService } from "../../../../../src/modules/provisioning/providers/fake/fake.service";
import { FakeProvisionerMock } from "../../../../mocks/provisioning/fake-provisioner.mock";

describe("FakeProvisionerService", () => {
    const client: DappClient = {
        dappId: "dapp-1",
        name: "Acme",
        description: "",
        logoUrl: "https://acme.example/logo.png",
        callbackUrls: ["https://acme.example/callback"],
        logoutUrls: [],
        webOrigins: ["https://acme.example"],
    };
    let provisioner: FakeProvisionerService;

    beforeEach(() => {
        provisioner = new FakeProvisionerService();
    });

    it("should store a created client under a fake id", async () => {
        const clientId = await provisioner.create(client);

        expect(clientId).toMatch(/^fake_/);
        expect(provisioner.clients.get(clientId)).toEqual(client);
    });

    describe("FakeProvisionerMock", () => {
        const mock = new FakeProvisionerMock();

        beforeEach(() => {
            mock.reset();
        });

        it("should fail a scripted call before it takes effect", async () => {
            mock.script("rejected");

            await expect(mock.create(client)).rejects.toMatchObject({ kind: "rejected" });
            expect(mock.clients.size).toBe(0);
        });

        it("should keep the effect of a call scripted to time out after success", async () => {
            mock.script("timeout_after_success");

            await expect(mock.create(client)).rejects.toMatchObject({ kind: "failed" });
            expect(mock.clients.size).toBe(1);
        });
    });
});
