import { DappClient, ProvisioningError } from "../../../../../src/modules/provisioning/interfaces/i-auth0-provisioner.service";
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

    it("should overwrite an updated client", async () => {
        const clientId = await provisioner.create(client);

        await provisioner.update(clientId, { ...client, name: "Acme 2" });

        expect(provisioner.clients.get(clientId)).toEqual({ ...client, name: "Acme 2" });
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

        it("should run a call scripted to succeed and fail the one scripted after it", async () => {
            mock.script("success").script("failed");

            const clientId = await mock.create(client);

            await expect(mock.update(clientId, { ...client, name: "Acme 2" })).rejects.toEqual(
                new ProvisioningError("failed", "Fake update: scripted failed"),
            );
            expect(mock.clients.get(clientId)).toEqual(client);
        });

        it("should keep the effect of a call scripted to time out after success", async () => {
            mock.script("timeout_after_success");

            await expect(mock.create(client)).rejects.toMatchObject({ kind: "failed" });
            expect(mock.clients.size).toBe(1);
        });
    });
});
