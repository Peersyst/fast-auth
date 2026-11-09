import { Dapp } from "@database/console/entities";
import { ERASED } from "@shared/modules/dapp";

const IDENTITY_COLUMNS = ["ownerEmail", "contactEmail"] as const;

const TEXT_COLUMNS = ["name", "description", "auth0Error"] as const;

// The domain needs a dot and a last label that doesn't start with a digit, so URLs such as
// https://cdn.jsdelivr.net/npm/@acme/brand@1.0.0/logo.svg keep their package versions and @handles.
const EMAIL_ADDRESS = /[^\s<>()"',;/]+(?:'[^\s<>()"',;/]+)*@(?:[^\s<>()"',;/@.]+\.)+[^\s<>()"',;/@.\d-][^\s<>()"',;/@.]*/g;

type IdentityColumn = (typeof IDENTITY_COLUMNS)[number];
type TextColumn = (typeof TEXT_COLUMNS)[number];

export type AnonymisableDapp = Pick<Dapp, IdentityColumn | TextColumn>;

export type AnonymisableEvent = { id: string; details: Record<string, unknown> };

export type Anonymisation = {
    dapp: Partial<AnonymisableDapp>;
    events: { id: string; changes: Partial<Omit<AnonymisableEvent, "id">> }[];
    erasedColumns: IdentityColumn[];
    scrubbedColumns: TextColumn[];
    scrubbedDetails: number;
};

/**
 * Replaces every email address in the object's values, recursing into nested arrays and objects.
 * @param value The object to scrub.
 * @returns A new object with the scrubbed values.
 */
const scrubObject = (value: object): Record<string, unknown> =>
    Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, scrub(inner)]));

/**
 * Replaces every email address in a string, or in the strings nested in an array or object.
 * @param value The value to scrub.
 * @returns The scrubbed value, or the value itself when it holds no string.
 */
function scrub(value: unknown): unknown {
    if (typeof value === "string") return value.replace(EMAIL_ADDRESS, ERASED);
    if (Array.isArray(value)) return value.map(scrub);
    if (typeof value === "object" && value !== null) return scrubObject(value);
    return value;
}

/**
 * Tells whether an identity column still holds something other than the erased marker.
 * @param value The column value.
 * @returns True when the value is set and not yet erased.
 */
const needsErasing = (value: string | null): value is string => value !== null && value !== ERASED;

/**
 * Works out the changes that erase a dApp's personal data, without writing anything. Values already erased are left out, so a
 * rerun yields no changes.
 * @param dapp The dApp's identity and text columns.
 * @param events The dApp's events.
 * @returns The changes per row and what they erase.
 */
export function anonymise(dapp: AnonymisableDapp, events: readonly AnonymisableEvent[]): Anonymisation {
    const result: Anonymisation = { dapp: {}, events: [], erasedColumns: [], scrubbedColumns: [], scrubbedDetails: 0 };
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
        const details = scrubObject(event.details);
        if (JSON.stringify(details) !== JSON.stringify(event.details)) {
            changes.details = details;
            result.scrubbedDetails += 1;
        }
        if (Object.keys(changes).length > 0) result.events.push({ id: event.id, changes });
    }
    return result;
}
