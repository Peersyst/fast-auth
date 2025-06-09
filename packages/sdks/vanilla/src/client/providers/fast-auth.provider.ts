import { IFastAuthProvider as ISignerFastAuthProvider } from "../../signers/providers/fast-auth.provider";

export interface IFastAuthProvider<O = any> extends ISignerFastAuthProvider<O> {
    login(opts?: O): void;
}
