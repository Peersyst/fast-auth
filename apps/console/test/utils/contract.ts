import type { DappEventResponse } from "../../src/modules/admin/responses/dapp-event.response";

export const ADMIN_EMAIL = "admin@console.test";
export const ADMIN_EMAILS = [ADMIN_EMAIL];

export type DappEvent = Omit<DappEventResponse, "details"> & { details: Record<string, unknown> };
