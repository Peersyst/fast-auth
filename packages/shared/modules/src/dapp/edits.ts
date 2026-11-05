import { DIRECT_FIELDS, SYNCED_FIELDS } from "./constants";
import { DappField, DappFields, DirectFields, FieldChange, FieldValue, FieldValueChange, SyncedFields } from "./types";

export type PendingChangeOutcome =
    | { kind: "unchanged" }
    | { kind: "withdrawn" }
    | { kind: "replaced"; change: SyncedFields; changes: FieldValueChange[] };

type EditOutcome = {
    directChanges: FieldChange[];
    pendingChange: PendingChangeOutcome;
};

/**
 * Copies only the fields that sync to Auth0, dropping any others the object carries.
 * @param fields An object that holds the synced fields.
 * @returns A new object with only the synced fields.
 */
export function syncedFieldsOf(fields: SyncedFields): SyncedFields {
    const { name, description, logoUrl, callbackUrls, logoutUrls, webOrigins } = fields;
    return { name, description, logoUrl, callbackUrls, logoutUrls, webOrigins };
}

/**
 * Copies only the fields an owner may change without review, dropping any others the object carries.
 * @param fields An object that holds the direct fields.
 * @returns A new object with only the direct fields.
 */
export function directFieldsOf(fields: DirectFields): DirectFields {
    const { contactEmail, mauBracket } = fields;
    return { contactEmail, mauBracket };
}

/**
 * Compares strings by value and lists as sets, ignoring order and duplicates.
 * @param before The old value.
 * @param after The new value.
 * @returns Whether the two values are the same.
 */
function isSameValue(before: FieldValue, after: FieldValue): boolean {
    if (!Array.isArray(before) || !Array.isArray(after)) return before === after;
    const afterSet = new Set(after);
    const beforeSet = new Set(before);
    return beforeSet.size === afterSet.size && [...beforeSet].every((value) => afterSet.has(value));
}

/**
 * Lists the given fields whose values differ, in the order given, without the contact email's values.
 * @param fields The fields to compare.
 * @param before The values before the edit.
 * @param after The values after the edit.
 * @returns One change per differing field.
 */
export function diffFields<F extends DappField>(
    fields: readonly F[],
    before: Pick<DappFields, F>,
    after: Pick<DappFields, F>,
): FieldChange[] {
    return fields
        .filter((field) => !isSameValue(before[field], after[field]))
        .map((field): FieldChange => {
            const key: DappField = field;
            return key === "contactEmail" ? { field: key } : { field: key, before: before[field], after: after[field] };
        });
}

/**
 * Lists the synced fields whose values differ, with before and after values for every one.
 * @param live The live fields.
 * @param change The changed fields.
 * @returns One change per differing synced field.
 */
export function diffSyncedFields(live: SyncedFields, change: SyncedFields): FieldValueChange[] {
    return SYNCED_FIELDS.filter((field) => !isSameValue(live[field], change[field])).map((field) => ({
        field,
        before: live[field],
        after: change[field],
    }));
}

/**
 * Decides whether an edit keeps, withdraws or replaces the pending change, by comparing its synced fields with the pending and live ones.
 * @param live The dApp's live fields.
 * @param pending The pending change, if any.
 * @param proposed The fields the edit proposes.
 * @returns The pending change's outcome.
 */
function classifyPendingChange(live: DappFields, pending: SyncedFields | null, proposed: DappFields): PendingChangeOutcome {
    if (pending !== null && diffSyncedFields(pending, proposed).length === 0) return { kind: "unchanged" };
    const changes = diffSyncedFields(live, proposed);
    if (changes.length > 0) return { kind: "replaced", change: syncedFieldsOf(proposed), changes };
    return pending === null ? { kind: "unchanged" } : { kind: "withdrawn" };
}

/**
 * Splits an edit into direct-field changes, which apply at once, and what happens to the pending change of synced fields.
 * @param live The dApp's live fields.
 * @param pending The pending change, if any.
 * @param proposed The fields the edit proposes.
 * @returns The direct changes and the pending change's outcome.
 */
export function classifyEdit(live: DappFields, pending: SyncedFields | null, proposed: DappFields): EditOutcome {
    return { directChanges: diffFields(DIRECT_FIELDS, live, proposed), pendingChange: classifyPendingChange(live, pending, proposed) };
}
