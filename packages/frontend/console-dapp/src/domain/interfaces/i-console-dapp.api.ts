import { MyDappDto, OwnerDappDto, UpdateDappRequest, UpsertDappRequest } from "@shared/console";

export interface IConsoleDappApi {
    /**
     * Gets the signed-in user's dApp.
     */
    getMine(): Promise<MyDappDto>;
    /**
     * Submits a new dApp for review.
     */
    submit(requestBody: UpsertDappRequest): Promise<OwnerDappDto>;
    /**
     * Saves the owner's edit of their dApp.
     */
    edit(id: string, requestBody: UpdateDappRequest): Promise<OwnerDappDto>;
    /**
     * Removes the owner's dApp.
     */
    remove(id: string, expectedVersion: number): Promise<void>;
}
