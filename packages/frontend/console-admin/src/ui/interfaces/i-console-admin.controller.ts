import { AdminDappDto, DappEventDto, DappOrderBy, DappStatus, OrderType, PaginatedDappsDto, UpdateDappRequest } from "@shared/console";

export type ListDappsParams = {
    page: number;
    order: OrderType;
    orderBy?: DappOrderBy;
    /**
     * Only pending dApps and approved dApps with a change under review.
     */
    needsReview: boolean;
    status?: DappStatus;
    search?: string;
};

export type AdminEditDappParams = {
    id: string;
    request: UpdateDappRequest;
};

/**
 * An action on a dApp, taken on the version the admin saw.
 */
export type DappActionParams = {
    id: string;
    expectedVersion: number;
};

export interface IConsoleAdminController {
    /**
     * Lists the dApps a filter matches, a page at a time.
     * @param params The filter, sort and page.
     * @returns The page.
     */
    listDapps(params: ListDappsParams): Promise<PaginatedDappsDto>;
    /**
     * Gets a dApp.
     * @param id The dApp's id.
     * @throws `DomainError(DAPP_NOT_FOUND)` when no dApp has that id, or it is not an id.
     * @returns The dApp.
     */
    getDapp(id: string): Promise<AdminDappDto>;
    /**
     * Lists a dApp's activity, newest first.
     * @param id The dApp's id.
     * @returns The events.
     */
    getDappEvents(id: string): Promise<DappEventDto[]>;
    /**
     * Saves an admin's edit of a dApp.
     * @param params The dApp's id and the edit, with the version it was made on.
     * @throws `DomainError(VALIDATION_FAILED)` when the console refuses a value, `DomainError(DAPP_CHANGED)`.
     * @returns The dApp after the edit.
     */
    editDapp(params: AdminEditDappParams): Promise<AdminDappDto>;
    /**
     * Approves a pending dApp, creating its Auth0 client.
     * @param params The dApp's id and the version shown.
     * @returns The approved dApp.
     */
    approveDapp(params: DappActionParams): Promise<AdminDappDto>;
    /**
     * Rejects a pending dApp.
     * @param params The dApp's id and the version shown.
     * @returns The rejected dApp.
     */
    rejectDapp(params: DappActionParams): Promise<AdminDappDto>;
    /**
     * Approves an approved dApp's change under review, updating its Auth0 client.
     * @param params The dApp's id and the version shown.
     * @returns The dApp with the change applied.
     */
    approveChange(params: DappActionParams): Promise<AdminDappDto>;
    /**
     * Rejects an approved dApp's change under review.
     * @param params The dApp's id and the version shown.
     * @returns The dApp without the change.
     */
    rejectChange(params: DappActionParams): Promise<AdminDappDto>;
    /**
     * Removes a dApp, deleting its Auth0 client.
     * @param params The dApp's id and the version shown.
     * @returns The removed dApp.
     */
    removeDapp(params: DappActionParams): Promise<AdminDappDto>;
}
