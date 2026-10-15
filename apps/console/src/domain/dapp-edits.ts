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

function isSameValue(before: FieldValue, after: FieldValue): boolean {
    if (!Array.isArray(before) || !Array.isArray(after)) return before === after;
    const afterSet = new Set(after);
    const beforeSet = new Set(before);
    return beforeSet.size === afterSet.size && [...beforeSet].every((value) => afterSet.has(value));
}

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

export function classifyEdit(live: DappFields, pending: SyncedFields | null, proposed: DappFields): EditOutcome {
    return { directChanges: diffFields(DIRECT_FIELDS, live, proposed), pendingChange: classifyPendingChange(live, pending, proposed) };
}

function classifyPendingChange(live: DappFields, pending: SyncedFields | null, proposed: DappFields): PendingChangeOutcome {
    if (pending !== null && diffFields(SYNCED_FIELDS, pending, proposed).length === 0) return { kind: "unchanged" };
    const changes = diffFields(SYNCED_FIELDS, live, proposed);
    if (changes.length > 0) return { kind: "replaced", change: syncedFieldsOf(proposed), changes };
    return pending === null ? { kind: "unchanged" } : { kind: "withdrawn" };
}
