import { IFastAuthProvider as ISignerFastAuthProvider } from "../../signers/providers/fast-auth.provider";

export interface IFastAuthProvider extends ISignerFastAuthProvider {
    login(opts?: any): void;
    logout(): void;
}
