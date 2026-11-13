import { DAPP_FIELDS, SYNCED_FIELDS } from "./constants";
import { DappFields, FieldValue } from "./types";

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
 * Keeps the requested fields whose values differ from the live ones, comparing lists as sets.
 * @param live The live fields.
 * @param requested The fields the edit sets. A missing field is left as it is.
 * @returns The fields that change, with their requested values.
 */
export function changedFields(live: DappFields, requested: Partial<DappFields>): Partial<DappFields> {
    const changed: Partial<Record<keyof DappFields, FieldValue>> = {};
    for (const field of DAPP_FIELDS) {
        const value = requested[field];
        if (value !== undefined && !isSameValue(live[field], value)) changed[field] = value;
    }
    return changed as Partial<DappFields>;
}

/**
 * Tells whether a change touches a field that syncs to Auth0.
 * @param change The changed fields.
 * @returns Whether any synced field changes.
 */
export function hasSyncedChange(change: Partial<DappFields>): boolean {
    return SYNCED_FIELDS.some((field) => change[field] !== undefined);
}
