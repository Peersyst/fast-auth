import { DappClient, ProvisioningError } from "../../../src/modules/provisioning/interfaces/i-auth0-provisioner.service";
import { FakeProvisionerService } from "../../../src/modules/provisioning/providers/fake/fake.service";

type FakeOutcome = "success" | "rejected" | "failed" | "timeout_after_success";
type FakeOp = "create" | "update";

export class FakeProvisionerMock extends FakeProvisionerService {
    /** Every client sent, an update's carrying its `clientId`. */
    readonly calls: (DappClient & { clientId?: string })[] = [];
    private readonly outcomes: FakeOutcome[] = [];
    private readonly interruptions = new Map<FakeOp, () => Promise<unknown>>();

    /**
     * Queues an outcome for the next call.
     * @param outcome The outcome that call gets.
     * @returns This provisioner, for chaining.
     */
    script(outcome: FakeOutcome): this {
        this.outcomes.push(outcome);
        return this;
    }

    /**
     * Runs another request in the middle of the next call of an operation, before that call takes effect.
     * @param op The operation to interrupt.
     * @param run The request to run.
     */
    during(op: FakeOp, run: () => Promise<unknown>): void {
        this.interruptions.set(op, run);
    }

    /**
     * Forgets every call, client, queued outcome and interruption.
     */
    reset(): void {
        this.calls.length = 0;
        this.clients.clear();
        this.outcomes.length = 0;
        this.interruptions.clear();
    }

    /**
     * Records the call, then stores a client with a random id, unless a scripted outcome fails it.
     * @param client The dApp and the fields synced to Auth0.
     * @returns The new client id.
     */
    async create(client: DappClient): Promise<string> {
        this.calls.push(structuredClone(client));
        return this.scripted("create", () => super.create(client));
    }

    /**
     * Records the call, then overwrites the stored client, unless a scripted outcome fails it.
     * @param clientId The client to overwrite.
     * @param client The dApp and the fields synced to Auth0.
     */
    async update(clientId: string, client: DappClient): Promise<void> {
        this.calls.push({ ...structuredClone(client), clientId });
        await this.scripted("update", () => super.update(clientId, client));
    }

    /**
     * Runs a call, after any interruption of it, unless the next scripted outcome fails it before or after it takes effect.
     * @param op The operation, for the message.
     * @param call The call.
     * @returns What the call returns.
     */
    private async scripted<T>(op: FakeOp, call: () => Promise<T>): Promise<T> {
        const outcome = this.outcomes.shift();
        const interruption = this.interruptions.get(op);
        if (interruption) {
            this.interruptions.delete(op);
            await interruption();
        }
        if (outcome === "rejected" || outcome === "failed") {
            throw new ProvisioningError(outcome, `Fake ${op}: scripted ${outcome}`);
        }
        const result = await call();
        if (outcome === "timeout_after_success") throw new ProvisioningError("failed", `Fake ${op}: scripted timeout after success`);
        return result;
    }
}
