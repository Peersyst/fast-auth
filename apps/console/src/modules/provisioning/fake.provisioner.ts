import { randomUUID } from "node:crypto";
import type { Auth0ClientId, DappId, SyncedFields } from "@shared/console-domain/dapp";
import type { Auth0Provisioner, ManagedClient } from "./auth0-provisioner";
import { ProvisioningError } from "./auth0-provisioner";

type FakeOutcome = "rejected" | "failed" | "timeout_after_success" | "tag_mismatch";

export type FakeProvisionerCall =
    | { op: "findClient"; dappId: DappId }
    | { op: "createClient"; dappId: DappId; input: SyncedFields }
    | { op: "updateClient"; dappId: DappId; clientId: Auth0ClientId; input: SyncedFields }
    | { op: "deleteClient"; dappId: DappId; clientId: Auth0ClientId }
    | { op: "checkHealth" }
    | { op: "listClients" };

type FakeProvisionerOp = FakeProvisionerCall["op"];

export type FakeHold = { reached: Promise<void>; release: () => void };

type Step = { kind: "outcome"; outcome: FakeOutcome } | { kind: "hold"; arrive: () => void; released: Promise<void> };

export class FakeProvisioner implements Auth0Provisioner {
    readonly calls: FakeProvisionerCall[] = [];
    readonly clients = new Map<Auth0ClientId, { dappId: DappId; input: SyncedFields }>();
    private readonly steps = new Map<FakeProvisionerOp, Step[]>();

    /**
     * Queues an outcome for the next call to op.
     * @param op The operation.
     * @param outcome The outcome that call gets.
     * @returns This provisioner, for chaining.
     */
    script(op: FakeProvisionerOp, outcome: FakeOutcome): this {
        this.queue(op).push({ kind: "outcome", outcome });
        return this;
    }

    /**
     * Queues a pause for the next call to op, which waits until it is released.
     * @param op The operation.
     * @returns A promise that resolves when the call arrives, and the function that lets it continue.
     */
    hold(op: FakeProvisionerOp): FakeHold {
        let arrive = (): void => {};
        let release = (): void => {};
        const reached = new Promise<void>((resolve) => (arrive = resolve));
        const released = new Promise<void>((resolve) => (release = resolve));
        this.queue(op).push({ kind: "hold", arrive, released });
        return { reached, release };
    }

    /**
     * Forgets every call, client and queued step.
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
    async findClient(dappId: DappId): Promise<Auth0ClientId | null> {
        this.calls.push({ op: "findClient", dappId });
        const outcome = await this.next("findClient");
        failBefore("findClient", outcome);
        const found = [...this.clients].find(([, client]) => client.dappId === dappId)?.[0] ?? null;
        failAfter("findClient", outcome);
        return found;
    }

    /**
     * Records the call, then stores a client with a random id, unless a scripted outcome fails it.
     * @param dappId The dApp.
     * @param input The fields synced to Auth0.
     * @returns The new client id.
     */
    async createClient(dappId: DappId, input: SyncedFields): Promise<Auth0ClientId> {
        this.calls.push({ op: "createClient", dappId, input: structuredClone(input) });
        const outcome = await this.next("createClient");
        failBefore("createClient", outcome);
        const clientId = `fake_${randomUUID()}` as Auth0ClientId;
        this.clients.set(clientId, { dappId, input: structuredClone(input) });
        failAfter("createClient", outcome);
        return clientId;
    }

    /**
     * Records the call, then overwrites the stored client, unless a scripted outcome fails it.
     * @param dappId The dApp.
     * @param clientId The dApp's client.
     * @param input The fields synced to Auth0.
     */
    async updateClient(dappId: DappId, clientId: Auth0ClientId, input: SyncedFields): Promise<void> {
        this.calls.push({ op: "updateClient", dappId, clientId, input: structuredClone(input) });
        const outcome = await this.next("updateClient");
        failBefore("updateClient", outcome);
        this.clients.set(clientId, { dappId, input: structuredClone(input) });
        failAfter("updateClient", outcome);
    }

    /**
     * Records the call, then removes the stored client, unless a scripted outcome fails it.
     * @param dappId The dApp.
     * @param clientId The dApp's client.
     */
    async deleteClient(dappId: DappId, clientId: Auth0ClientId): Promise<void> {
        this.calls.push({ op: "deleteClient", dappId, clientId });
        const outcome = await this.next("deleteClient");
        failBefore("deleteClient", outcome);
        this.clients.delete(clientId);
        failAfter("deleteClient", outcome);
    }

    /**
     * Records the call and throws only when a scripted outcome fails it.
     */
    async checkHealth(): Promise<void> {
        this.calls.push({ op: "checkHealth" });
        const outcome = await this.next("checkHealth");
        failBefore("checkHealth", outcome);
        failAfter("checkHealth", outcome);
    }

    /**
     * Records the call, then lists the stored clients, unless a scripted outcome fails it.
     * @returns The stored clients.
     */
    async listClients(): Promise<ManagedClient[]> {
        this.calls.push({ op: "listClients" });
        const outcome = await this.next("listClients");
        failBefore("listClients", outcome);
        const clients = [...this.clients].map(([clientId, { dappId, input }]) => ({
            clientId,
            dappId,
            name: input.name,
            callbacks: [...input.callbackUrls],
        }));
        failAfter("listClients", outcome);
        return clients;
    }

    /**
     * Gets the step queue for op, creating it when missing.
     * @param op The operation.
     * @returns The live queue.
     */
    private queue(op: FakeProvisionerOp): Step[] {
        const steps = this.steps.get(op) ?? [];
        this.steps.set(op, steps);
        return steps;
    }

    /**
     * Takes the next step for op and waits out a hold.
     * @param op The operation.
     * @returns The scripted outcome, or undefined for none or after a hold.
     */
    private async next(op: FakeProvisionerOp): Promise<FakeOutcome | undefined> {
        const step = this.queue(op).shift();
        if (step?.kind !== "hold") return step?.outcome;
        step.arrive();
        await step.released;
        return undefined;
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
