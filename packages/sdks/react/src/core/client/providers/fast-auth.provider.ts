import { IFastAuthProvider as ISignerFastAuthProvider } from "../../signers/providers/fast-auth.provider";

export interface IFastAuthProvider extends ISignerFastAuthProvider {
    login(...args: any[]): void;
    logout(): void;
}
