import { DappDto, PaginatedDappsDto } from "@shared/console";

export interface IConsoleAdminController {
    /**
     * Lists every dApp, oldest first, a page at a time.
     * @param page The page.
     * @returns The page.
     */
    listDapps(page: number): Promise<PaginatedDappsDto>;
    /**
     * Gets a dApp.
     * @param id The dApp's id.
     * @throws `DomainError(DAPP_NOT_FOUND)` when no dApp has that id, or it is not an id.
     * @returns The dApp.
     */
    getDapp(id: string): Promise<DappDto>;
    /**
     * Approves a pending dApp, creating its Auth0 client.
     * @param id The dApp's id.
     * @returns The approved dApp.
     */
    approveDapp(id: string): Promise<DappDto>;
    /**
     * Rejects a pending dApp.
     * @param id The dApp's id.
     * @returns The rejected dApp.
     */
    rejectDapp(id: string): Promise<DappDto>;
    /**
     * Approves an approved dApp's change under review, updating its Auth0 client.
     * @param id The dApp's id.
     * @returns The dApp with the change applied.
     */
    approveChange(id: string): Promise<DappDto>;
    /**
     * Rejects an approved dApp's change under review.
     * @param id The dApp's id.
     * @returns The dApp without the change.
     */
    rejectChange(id: string): Promise<DappDto>;
}
