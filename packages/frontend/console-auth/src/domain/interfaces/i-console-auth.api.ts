import { MeDto } from "@shared/console";

export interface IConsoleAuthApi {
    /**
     * Gets the signed-in user's email, role and email verification.
     */
    me(): Promise<MeDto>;
}
