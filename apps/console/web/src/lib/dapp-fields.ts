import { FIELD_LABELS, MAU_LABELS, MauBracket, SYNCED_FIELDS } from "@shared/console-domain/dapp";
import { diffSyncedFields, type FieldValueChange } from "@shared/console-domain/dapp-edits";
import type { FieldValue } from "@shared/console-domain/dapp-event";

export { diffSyncedFields, FIELD_LABELS, MAU_LABELS, SYNCED_FIELDS };
export type { FieldValue, FieldValueChange };

export const MAU_BRACKETS = Object.values(MauBracket);
