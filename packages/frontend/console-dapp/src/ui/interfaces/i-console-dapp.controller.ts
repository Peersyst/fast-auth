import { OwnerDappDto, UpdateDappRequest, UpsertDappRequest } from "@shared/console";

export type EditDappParams = {
    id: string;
    request: UpdateDappRequest;
};

export type WithdrawChangeParams = {
    /**
     * The dApp as shown, whose live fields the edit saves.
     */
    dapp: OwnerDappDto;
    /**
     * The version shown when the owner chose to withdraw.
     */
    expectedVersion: number;
};

export type RemoveDappParams = {
    id: string;
    expectedVersion: number;
};

export interface IConsoleDappController {
    /**
     * Gets the signed-in user's dApp.
     * @returns The dApp, or `null` when they have none.
     */
    getMyDapp(): Promise<OwnerDappDto | null>;
    /**
     * Submits a new dApp for review.
     * @param fields The dApp's fields.
     * @throws `DomainError(VALIDATION_FAILED)` when the console refuses a value, `DomainError(DAPP_ALREADY_EXISTS)` when the email has a dApp.
     * @returns The new dApp, pending or, through auto-approval, approved.
     */
    submitDapp(fields: UpsertDappRequest): Promise<OwnerDappDto>;
    /**
     * Saves an edit of the owner's dApp.
     * @param params The dApp's id and the edit, with the version it was made on.
     * @throws `DomainError(DAPP_CHANGED)` when the dApp changed since that version.
     * @returns The dApp after the edit.
     */
    editDapp(params: EditDappParams): Promise<OwnerDappDto>;
    /**
     * Withdraws an approved dApp's change under review by saving its live fields.
     * @param params The dApp as shown and the version shown.
     * @returns The dApp without the change.
     */
    withdrawChange(params: WithdrawChangeParams): Promise<OwnerDappDto>;
    /**
     * Removes the owner's dApp.
     * @param params The dApp's id and the version shown.
     */
    removeDapp(params: RemoveDappParams): Promise<void>;
}
