import { CreateDappRequest, DappDto, UpdateDappRequest } from "@shared/console";

export type EditDappParams = {
    id: string;
    request: UpdateDappRequest;
};

export interface IConsoleDappController {
    /**
     * Gets the signed-in user's dApp.
     * @returns The dApp, or `null` when they have none.
     */
    getMyDapp(): Promise<DappDto | null>;
    /**
     * Submits a new dApp for review.
     * @param fields The dApp's fields.
     * @throws `DomainError(VALIDATION_FAILED)` when the console refuses a value, `DomainError(DAPP_ALREADY_EXISTS)` when the email has a dApp.
     * @returns The new dApp, pending or, through auto-approval, approved.
     */
    submitDapp(fields: CreateDappRequest): Promise<DappDto>;
    /**
     * Saves an edit of the owner's dApp. A pending dApp changes in place, a rejected one changes in place and goes back to pending, and an approved one gets the edit as its change under review.
     * @param params The dApp's id and the edit.
     * @throws `DomainError(INVALID_TRANSITION)` when a review or another resubmission lands while the edit runs.
     * @returns The dApp after the edit.
     */
    editDapp(params: EditDappParams): Promise<DappDto>;
    /**
     * Deletes the owner's dApp in any status. Its Auth0 client, if any, stays as it is.
     * @param id The dApp's id.
     * @throws `DomainError(DAPP_NOT_FOUND)` when the dApp is already gone.
     */
    deleteDapp(id: string): Promise<void>;
}
