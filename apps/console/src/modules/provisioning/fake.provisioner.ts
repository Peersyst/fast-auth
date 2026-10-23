import { randomUUID } from "node:crypto";
import type { Auth0ClientId, DappId, SyncedFields } from "../../domain/dapp";
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

    script(op: FakeProvisionerOp, outcome: FakeOutcome): this {
        this.queue(op).push({ kind: "outcome", outcome });
        return this;
    }

    hold(op: FakeProvisionerOp): FakeHold {
        let arrive = (): void => {};
        let release = (): void => {};
        const reached = new Promise<void>((resolve) => (arrive = resolve));
        const released = new Promise<void>((resolve) => (release = resolve));
        this.queue(op).push({ kind: "hold", arrive, released });
        return { reached, release };
    }

    reset(): void {
        this.calls.length = 0;
        this.clients.clear();
        this.steps.clear();
    }

    async findClient(dappId: DappId): Promise<Auth0ClientId | null> {
        this.calls.push({ op: "findClient", dappId });
        const outcome = await this.next("findClient");
        failBefore("findClient", outcome);
        const found = [...this.clients].find(([, client]) => client.dappId === dappId)?.[0] ?? null;
        failAfter("findClient", outcome);
        return found;
    }

    async createClient(dappId: DappId, input: SyncedFields): Promise<Auth0ClientId> {
        this.calls.push({ op: "createClient", dappId, input: structuredClone(input) });
        const outcome = await this.next("createClient");
        failBefore("createClient", outcome);
        const clientId = `fake_${randomUUID()}` as Auth0ClientId;
        this.clients.set(clientId, { dappId, input: structuredClone(input) });
        failAfter("createClient", outcome);
        return clientId;
    }

    async updateClient(dappId: DappId, clientId: Auth0ClientId, input: SyncedFields): Promise<void> {
        this.calls.push({ op: "updateClient", dappId, clientId, input: structuredClone(input) });
        const outcome = await this.next("updateClient");
        failBefore("updateClient", outcome);
        this.clients.set(clientId, { dappId, input: structuredClone(input) });
        failAfter("updateClient", outcome);
    }

    async deleteClient(dappId: DappId, clientId: Auth0ClientId): Promise<void> {
        this.calls.push({ op: "deleteClient", dappId, clientId });
        const outcome = await this.next("deleteClient");
        failBefore("deleteClient", outcome);
        this.clients.delete(clientId);
        failAfter("deleteClient", outcome);
    }

    async checkHealth(): Promise<void> {
        this.calls.push({ op: "checkHealth" });
        const outcome = await this.next("checkHealth");
        failBefore("checkHealth", outcome);
        failAfter("checkHealth", outcome);
    }

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

    private queue(op: FakeProvisionerOp): Step[] {
        const steps = this.steps.get(op) ?? [];
        this.steps.set(op, steps);
        return steps;
    }

    private async next(op: FakeProvisionerOp): Promise<FakeOutcome | undefined> {
        const step = this.queue(op).shift();
        if (step?.kind !== "hold") return step?.outcome;
        step.arrive();
        await step.released;
        return undefined;
    }
}

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

function failAfter(op: FakeProvisionerOp, outcome: FakeOutcome | undefined): void {
    if (outcome === "timeout_after_success") throw new ProvisioningError("failed", `Fake ${op}: scripted timeout after success`);
}
