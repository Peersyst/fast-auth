import { Dapp } from "@database/console/entities";
import { DappStatus, MauBracket } from "@shared/modules/dapp";
import { mockify } from "@shared/test";
import { register } from "prom-client";
import { EntityManager } from "typeorm";
import { CreateDappRequest } from "../../../src/modules/dapp/requests/create-dapp.request";

export const DappMock = mockify<Dapp>({
    id: "6f1c2a9e-3b4d-4e5f-8a7b-9c0d1e2f3a4b",
    ownerEmail: "owner@acme.example",
    name: "Acme & Co",
    description: "A wallet",
    logoUrl: "https://acme.example/logo.png",
    mauBracket: MauBracket.LT_1K,
    callbackUrls: ["https://acme.example/callback"],
    logoutUrls: [],
    webOrigins: ["https://acme.example"],
    contactEmail: "dev@acme.example",
    status: DappStatus.PENDING,
    auth0ClientId: null,
    auth0Error: null,
    reviewedAt: null,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
});

/**
 * Builds a valid submission form.
 * @param overrides Fields to change.
 * @returns The form.
 */
export const dappForm = (overrides: Partial<CreateDappRequest> = {}): CreateDappRequest => ({
    name: "Acme Wallet",
    description: "A wallet for NEAR.",
    logoUrl: "https://cdn.acme.xyz/logo.png",
    mauBracket: MauBracket.LT_1K,
    callbackUrls: ["https://acme.xyz/callback"],
    logoutUrls: [],
    webOrigins: ["https://acme.xyz"],
    contactEmail: "dev@acme.xyz",
    ...overrides,
});

/**
 * Reads a stored dApp.
 * @param manager The entity manager to read with.
 * @param id The dApp id.
 * @returns The dApp.
 */
export function findDapp(manager: EntityManager, id: string): Promise<Dapp> {
    return manager.findOneByOrFail(Dapp, { id });
}

/**
 * Reads console_transitions_total from the default registry.
 * @returns Each count, keyed by its action and result.
 */
export async function transitionCounts(): Promise<Record<string, number>> {
    const { values } = await register.getSingleMetric("console_transitions_total")!.get();
    return Object.fromEntries(values.map(({ labels, value }) => [`${labels.action} ${labels.result}`, value]));
}
