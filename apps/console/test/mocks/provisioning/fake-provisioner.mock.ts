import { SyncedFields } from "@shared/modules/dapp";
import { ProvisioningError } from "../../../src/modules/provisioning/interfaces/i-auth0-provisioner.service";
import { FakeProvisionerService } from "../../../src/modules/provisioning/providers/fake/fake.service";

type FakeOutcome = "rejected" | "failed" | "timeout_after_success" | "tag_mismatch";

type FakeProvisionerCall =
    | { op: "findClient"; dappId: string }
    | { op: "createClient"; dappId: string; input: SyncedFields }
    | { op: "updateClient"; dappId: string; clientId: string; input: SyncedFields }
    | { op: "deleteClient"; dappId: string; clientId: string };

type FakeProvisionerOp = FakeProvisionerCall["op"];

export class FakeProvisionerMock extends FakeProvisionerService {
    readonly calls: FakeProvisionerCall[] = [];
    private readonly steps = new Map<FakeProvisionerOp, FakeOutcome[]>();

    /**
     * Queues an outcome for the next call to op.
     * @param op The operation.
     * @param outcome The outcome that call gets.
     * @returns This provisioner, for chaining.
     */
    script(op: FakeProvisionerOp, outcome: FakeOutcome): this {
        this.queue(op).push(outcome);
        return this;
    }

    /**
     * Forgets every call, client and queued outcome.
     */
    reset(): void {
        this.calls.length = 0;
        this.clients.clear();
        this.steps.clear();
    }

    /**
     * Records the call, then finds the dApp's client in memory, unless a scripted outcome fails it.
     * @param dappId The dApp.
     * @returns The client id, or null when none names the dApp.
     */
    async findClient(dappId: string): Promise<string | null> {
        this.calls.push({ op: "findClient", dappId });
        const outcome = this.next("findClient");
        failBefore("findClient", outcome);
        const found = await super.findClient(dappId);
        failAfter("findClient", outcome);
        return found;
    }

    /**
     * Records the call, then stores a client with a random id, unless a scripted outcome fails it.
     * @param dappId The dApp.
     * @param input The fields synced to Auth0.
     * @returns The new client id.
     */
    async createClient(dappId: string, input: SyncedFields): Promise<string> {
        this.calls.push({ op: "createClient", dappId, input: structuredClone(input) });
        const outcome = this.next("createClient");
        failBefore("createClient", outcome);
        const clientId = await super.createClient(dappId, input);
        failAfter("createClient", outcome);
        return clientId;
    }

    /**
     * Records the call, then overwrites the stored client, unless a scripted outcome fails it.
     * @param dappId The dApp.
     * @param clientId The dApp's client.
     * @param input The fields synced to Auth0.
     */
    async updateClient(dappId: string, clientId: string, input: SyncedFields): Promise<void> {
        this.calls.push({ op: "updateClient", dappId, clientId, input: structuredClone(input) });
        const outcome = this.next("updateClient");
        failBefore("updateClient", outcome);
        await super.updateClient(dappId, clientId, input);
        failAfter("updateClient", outcome);
    }

    /**
     * Records the call, then removes the stored client, unless a scripted outcome fails it.
     * @param dappId The dApp.
     * @param clientId The dApp's client.
     */
    async deleteClient(dappId: string, clientId: string): Promise<void> {
        this.calls.push({ op: "deleteClient", dappId, clientId });
        const outcome = this.next("deleteClient");
        failBefore("deleteClient", outcome);
        await super.deleteClient(dappId, clientId);
        failAfter("deleteClient", outcome);
    }

    /**
     * Gets the outcome queue for op, creating it when missing.
     * @param op The operation.
     * @returns The live queue.
     */
    private queue(op: FakeProvisionerOp): FakeOutcome[] {
        const steps = this.steps.get(op) ?? [];
        this.steps.set(op, steps);
        return steps;
    }

    /**
     * Takes the next scripted outcome for op.
     * @param op The operation.
     * @returns The scripted outcome, or undefined for none.
     */
    private next(op: FakeProvisionerOp): FakeOutcome | undefined {
        return this.queue(op).shift();
    }
}

/**
 * Throws for an outcome that fails the call before it takes effect.
 * @param op The operation, for the message.
 * @param outcome The scripted outcome.
 */
function failBefore(op: FakeProvisionerOp, outcome: FakeOutcome | undefined): void {
    switch (outcome) {
        case undefined:
        case "timeout_after_success":
            return;
        case "rejected":
        case "failed":
        case "tag_mismatch":
            throw new ProvisioningError(outcome, `Fake ${op}: scripted ${outcome}`);
    }
}

/**
 * Throws for a timeout after success, once the call has taken effect.
 * @param op The operation, for the message.
 * @param outcome The scripted outcome.
 */
function failAfter(op: FakeProvisionerOp, outcome: FakeOutcome | undefined): void {
    if (outcome === "timeout_after_success") throw new ProvisioningError("failed", `Fake ${op}: scripted timeout after success`);
}
