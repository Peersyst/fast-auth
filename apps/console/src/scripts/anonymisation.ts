import { ERASED, type Dapp } from "../domain/dapp";

const IDENTITY_COLUMNS = ["ownerEmail", "contactEmail", "reviewedBy", "removedBy"] as const;

const TEXT_COLUMNS = ["name", "description", "rejectionReason", "removalReason", "auth0Error"] as const;

const EMAIL_ADDRESS = /[^\s<>()"',;]+(?:'[^\s<>()"',;]+)*@[^\s<>()"',;]+/g;

type IdentityColumn = (typeof IDENTITY_COLUMNS)[number];
type TextColumn = (typeof TEXT_COLUMNS)[number];

export type AnonymisableDapp = Pick<Dapp, IdentityColumn | TextColumn>;

export type AnonymisableEvent = { id: string; actorEmail: string | null; details: Record<string, unknown> };

export type Anonymisation = {
    dapp: Partial<AnonymisableDapp>;
    events: { id: string; changes: Partial<Omit<AnonymisableEvent, "id">> }[];
    erasedColumns: IdentityColumn[];
    scrubbedColumns: TextColumn[];
    erasedActors: number;
    scrubbedDetails: number;
};

const scrubObject = (value: object): Record<string, unknown> =>
    Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, scrub(inner)]));

function scrub(value: unknown): unknown {
    if (typeof value === "string") return value.replace(EMAIL_ADDRESS, ERASED);
    if (Array.isArray(value)) return value.map(scrub);
    if (typeof value === "object" && value !== null) return scrubObject(value);
    return value;
}

const needsErasing = (value: string | null): value is string => value !== null && value !== ERASED;

export function anonymise(dapp: AnonymisableDapp, events: readonly AnonymisableEvent[]): Anonymisation {
    const result: Anonymisation = { dapp: {}, events: [], erasedColumns: [], scrubbedColumns: [], erasedActors: 0, scrubbedDetails: 0 };
    for (const column of IDENTITY_COLUMNS) {
        if (!needsErasing(dapp[column])) continue;
        result.dapp[column] = ERASED;
        result.erasedColumns.push(column);
    }
    for (const column of TEXT_COLUMNS) {
        const value = dapp[column];
        if (value === null) continue;
        const scrubbed = value.replace(EMAIL_ADDRESS, ERASED);
        if (scrubbed === value) continue;
        result.dapp[column] = scrubbed;
        result.scrubbedColumns.push(column);
    }
    for (const event of events) {
        const changes: Partial<Omit<AnonymisableEvent, "id">> = {};
        if (needsErasing(event.actorEmail)) {
            changes.actorEmail = ERASED;
            result.erasedActors += 1;
        }
        const details = scrubObject(event.details);
        if (JSON.stringify(details) !== JSON.stringify(event.details)) {
            changes.details = details;
            result.scrubbedDetails += 1;
        }
        if (Object.keys(changes).length > 0) result.events.push({ id: event.id, changes });
    }
    return result;
}
