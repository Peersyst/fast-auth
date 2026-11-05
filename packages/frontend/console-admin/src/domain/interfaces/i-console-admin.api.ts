import {
    AdminDappDto,
    ChangeOwnerRequest,
    DappEventDto,
    DappOrderBy,
    DappStatus,
    ExpectedVersionRequest,
    OrderType,
    PaginatedDappsDto,
    ReasonRequest,
    UpdateDappRequest,
} from "@shared/console";

export interface IConsoleAdminApi {
    /**
     * Lists the dApps a filter matches, a page at a time.
     */
    list(
        page?: number,
        pageSize?: number,
        order?: OrderType,
        orderBy?: DappOrderBy,
        needsReview?: boolean,
        status?: DappStatus,
        q?: string,
    ): Promise<PaginatedDappsDto>;
    /**
     * Gets a dApp.
     */
    get(id: string): Promise<AdminDappDto>;
    /**
     * Saves an admin's edit of a dApp.
     */
    edit(id: string, requestBody: UpdateDappRequest): Promise<AdminDappDto>;
    /**
     * Approves a pending dApp.
     */
    approve(id: string, requestBody: ExpectedVersionRequest): Promise<AdminDappDto>;
    /**
     * Rejects a pending dApp.
     */
    reject(id: string, requestBody: ReasonRequest): Promise<AdminDappDto>;
    /**
     * Approves an approved dApp's change under review.
     */
    approveChange(id: string, requestBody: ExpectedVersionRequest): Promise<AdminDappDto>;
    /**
     * Rejects an approved dApp's change under review.
     */
    rejectChange(id: string, requestBody: ReasonRequest): Promise<AdminDappDto>;
    /**
     * Hands a dApp to another email.
     */
    changeOwner(id: string, requestBody: ChangeOwnerRequest): Promise<AdminDappDto>;
    /**
     * Removes a dApp.
     */
    remove(id: string, requestBody: ReasonRequest): Promise<AdminDappDto>;
    /**
     * Lists a dApp's activity, newest first.
     */
    listEvents(id: string): Promise<DappEventDto[]>;
}
