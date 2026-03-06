import { PublicKey } from "../../types/attestation.types";

export interface KeyProvider {
    readonly name: string;
    getCurrentPublicKeys(): Promise<PublicKey[]>;
}
