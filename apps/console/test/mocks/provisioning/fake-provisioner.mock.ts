import { DappClient, ProvisioningError } from "../../../src/modules/provisioning/interfaces/i-auth0-provisioner.service";
import { FakeProvisionerService } from "../../../src/modules/provisioning/providers/fake/fake.service";

type FakeOutcome = "rejected" | "failed" | "timeout_after_success";

export class FakeProvisionerMock extends FakeProvisionerService {
    readonly calls: DappClient[] = [];
    private readonly outcomes: FakeOutcome[] = [];

    /**
     * Queues an outcome for the next create.
     * @param outcome The outcome that call gets.
     * @returns This provisioner, for chaining.
     */
    script(outcome: FakeOutcome): this {
        this.outcomes.push(outcome);
        return this;
    }

    /**
     * Forgets every call, client and queued outcome.
     */
    reset(): void {
        this.calls.length = 0;
        this.clients.clear();
        this.outcomes.length = 0;
    }

    /**
     * Records the call, then stores a client with a random id, unless a scripted outcome fails it.
     * @param client The dApp and the fields synced to Auth0.
     * @returns The new client id.
     */
    async create(client: DappClient): Promise<string> {
        this.calls.push(structuredClone(client));
        const outcome = this.outcomes.shift();
        if (outcome === "rejected" || outcome === "failed") throw new ProvisioningError(outcome, `Fake create: scripted ${outcome}`);
        const clientId = await super.create(client);
        if (outcome === "timeout_after_success") throw new ProvisioningError("failed", "Fake create: scripted timeout after success");
        return clientId;
    }
}
