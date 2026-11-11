import { SyncedFields } from "@shared/modules/dapp";
import { FakeProvisionerService } from "../../../../../src/modules/provisioning/providers/fake/fake.service";
import { FakeProvisionerMock } from "../../../../mocks/provisioning/fake-provisioner.mock";

const INPUT: SyncedFields = {
    name: "Acme",
    description: "",
    logoUrl: "https://acme.example/logo.png",
    callbackUrls: ["https://acme.example/callback"],
    logoutUrls: [],
    webOrigins: ["https://acme.example"],
};

describe("FakeProvisionerService", () => {
    let provisioner: FakeProvisionerService;

    beforeEach(() => {
        provisioner = new FakeProvisionerService();
    });

    it("should store a created client and find it by its dApp", async () => {
        const clientId = await provisioner.createClient("dapp-1", INPUT);

        expect(clientId).toMatch(/^fake_/);
        await expect(provisioner.findClient("dapp-1")).resolves.toBe(clientId);
        expect(provisioner.clients.get(clientId)).toEqual({ dappId: "dapp-1", input: INPUT });
    });

    it("should overwrite an updated client and forget a deleted one", async () => {
        const clientId = await provisioner.createClient("dapp-1", INPUT);

        await provisioner.updateClient("dapp-1", clientId, { ...INPUT, name: "Acme 2" });
        expect(provisioner.clients.get(clientId)).toEqual({ dappId: "dapp-1", input: { ...INPUT, name: "Acme 2" } });

        await provisioner.deleteClient("dapp-1", clientId);
        await expect(provisioner.findClient("dapp-1")).resolves.toBeNull();
        expect(provisioner.clients.size).toBe(0);
    });
});

describe("FakeProvisionerMock", () => {
    const provisioner = new FakeProvisionerMock();

    beforeEach(() => {
        provisioner.reset();
    });

    it("should fail a scripted call before it takes effect", async () => {
        provisioner.script("createClient", "rejected");

        await expect(provisioner.createClient("dapp-1", INPUT)).rejects.toMatchObject({ kind: "rejected" });
        expect(provisioner.clients.size).toBe(0);
    });

    it("should keep the effect of a call scripted to time out after success", async () => {
        provisioner.script("createClient", "timeout_after_success");

        await expect(provisioner.createClient("dapp-1", INPUT)).rejects.toMatchObject({ kind: "failed" });
        await expect(provisioner.findClient("dapp-1")).resolves.toMatch(/^fake_/);
    });
});
