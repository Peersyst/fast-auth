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

    it("should store a created client and find and list it by its dApp", async () => {
        const clientId = await provisioner.createClient("dapp-1", INPUT);

        expect(clientId).toMatch(/^fake_/);
        await expect(provisioner.findClient("dapp-1")).resolves.toBe(clientId);
        await expect(provisioner.listClients()).resolves.toEqual([
            { clientId, dappId: "dapp-1", name: "Acme", callbacks: INPUT.callbackUrls },
        ]);
    });

    it("should overwrite an updated client and forget a deleted one", async () => {
        const clientId = await provisioner.createClient("dapp-1", INPUT);

        await provisioner.updateClient("dapp-1", clientId, { ...INPUT, name: "Acme 2", callbackUrls: ["https://acme.example/new"] });
        await expect(provisioner.listClients()).resolves.toEqual([
            { clientId, dappId: "dapp-1", name: "Acme 2", callbacks: ["https://acme.example/new"] },
        ]);

        await provisioner.deleteClient("dapp-1", clientId);
        await expect(provisioner.findClient("dapp-1")).resolves.toBeNull();
        await expect(provisioner.listClients()).resolves.toEqual([]);
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
