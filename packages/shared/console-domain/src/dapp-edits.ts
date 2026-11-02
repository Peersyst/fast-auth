import type { DappField, DappFields, SyncedFields } from "./dapp";
import { DIRECT_FIELDS, SYNCED_FIELDS, syncedFieldsOf } from "./dapp";
import type { FieldChange, FieldValue } from "./dapp-event";

export type PendingChangeOutcome =
    | { kind: "unchanged" }
    | { kind: "withdrawn" }
    | { kind: "replaced"; change: SyncedFields; changes: FieldChange[] };

type EditOutcome = {
    directChanges: FieldChange[];
    pendingChange: PendingChangeOutcome;
};

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
    const changes: FieldChange[] = [];
    for (const key of fields) {
        const field: DappField = key;
        const oldValue: FieldValue = before[key];
        const newValue: FieldValue = after[key];
        if (isSameValue(oldValue, newValue)) continue;
        changes.push(field === "contactEmail" ? { field } : { field, before: oldValue, after: newValue });
    }
    return changes;
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

/**
 * Decides whether an edit keeps, withdraws or replaces the pending change, by comparing its synced fields with the pending and live ones.
 * @param live The dApp's live fields.
 * @param pending The pending change, if any.
 * @param proposed The fields the edit proposes.
 * @returns The pending change's outcome.
 */
function classifyPendingChange(live: DappFields, pending: SyncedFields | null, proposed: DappFields): PendingChangeOutcome {
    if (pending !== null && diffFields(SYNCED_FIELDS, pending, proposed).length === 0) return { kind: "unchanged" };
    const changes = diffFields(SYNCED_FIELDS, live, proposed);
    if (changes.length > 0) return { kind: "replaced", change: syncedFieldsOf(proposed), changes };
    return pending === null ? { kind: "unchanged" } : { kind: "withdrawn" };
}
