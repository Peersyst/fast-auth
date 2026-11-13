import { DappDto, PaginatedDappsDto } from "@shared/console";

export interface IConsoleAdminApi {
    /**
     * Lists every dApp, oldest first, a page at a time.
     */
    list(page?: number, pageSize?: number): Promise<PaginatedDappsDto>;
    /**
     * Gets a dApp.
     */
    get(id: string): Promise<DappDto>;
    /**
     * Approves a pending dApp.
     */
    approve(id: string): Promise<DappDto>;
    /**
     * Rejects a pending dApp.
     */
    reject(id: string): Promise<DappDto>;
    /**
     * Approves an approved dApp's change under review.
     */
    approveChange(id: string): Promise<DappDto>;
    /**
     * Rejects an approved dApp's change under review.
     */
    rejectChange(id: string): Promise<DappDto>;
}
