import type { MauBracket } from "../../src/domain/dapp";
import type { AdminDappResponse } from "../../src/modules/admin/response/admin-dapp.response";
import type { DappEventResponse } from "../../src/modules/admin/response/dapp-event.response";
import type { PaginatedDappsResponse } from "../../src/modules/admin/response/paginated-dapps.response";
import type { ErrorResponse } from "../../src/modules/common/response/error.response";
import type { UpsertDappRequest } from "../../src/modules/dapps/requests/upsert-dapp.request";
import type { OwnerDappResponse } from "../../src/modules/dapps/response/owner-dapp.response";
import type { SettingsResponse } from "../../src/modules/settings/response/settings.response";

export const ADMIN_EMAIL = "admin@console.test";
export const ADMIN_EMAILS = [ADMIN_EMAIL];

export type { MauBracket };
export type DappFormFields = UpsertDappRequest;
export type OwnerDapp = OwnerDappResponse;
export type AdminDapp = AdminDappResponse;
export type DappEvent = Omit<DappEventResponse, "details"> & { details: Record<string, unknown> };
export type DappList = PaginatedDappsResponse;
export type Settings = SettingsResponse;

export type ErrorBody = ErrorResponse;
