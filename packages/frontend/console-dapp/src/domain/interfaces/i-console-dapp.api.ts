import { CreateDappRequest, DappDto, PaginatedDappsDto, UpdateDappRequest } from "@shared/console";

export interface IConsoleDappApi {
    /**
     * Lists the signed-in user's dApps, which are at most one.
     */
    list(): Promise<PaginatedDappsDto>;
    /**
     * Submits a new dApp for review.
     */
    create(requestBody: CreateDappRequest): Promise<DappDto>;
    /**
     * Saves the owner's edit of their dApp.
     */
    update(id: string, requestBody: UpdateDappRequest): Promise<DappDto>;
}
