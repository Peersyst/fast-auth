import { FIELD_LABELS, MAU_LABELS, MauBracket, SYNCED_FIELDS } from "../../../src/domain/dapp";
import { diffSyncedFields, type FieldValueChange } from "../../../src/domain/dapp-edits";
import type { FieldValue } from "../../../src/domain/dapp-event";

export { diffSyncedFields, FIELD_LABELS, MAU_LABELS, SYNCED_FIELDS };
export type { FieldValue, FieldValueChange };

export const MAU_BRACKETS = Object.values(MauBracket);
