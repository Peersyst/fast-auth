import { PublicKey } from "../../types/attestation.types";
import { parseRsaPublicKeyFromCertPem } from "../../utils/rsa-public-key-from-pem";
import { KeyProvider } from "./key-provider.interface";

export class GoogleKeyProvider implements KeyProvider {
    readonly name = "google";

    constructor(private readonly certificatesUrl: string) {}

    async getCurrentPublicKeys(): Promise<PublicKey[]> {
        const res = await fetch(this.certificatesUrl);
        if (!res.ok) throw new Error(`error fetching current public keys ${res.status} ${await res.text()}`);

        const resJson = (await res.json()) as Record<string, string>;

        return Object.values(resJson).map((certificate) => parseRsaPublicKeyFromCertPem(certificate));
    }
}
