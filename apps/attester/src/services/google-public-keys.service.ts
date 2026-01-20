import { PublicKey } from "../types/attestation.types";
import { parseRsaPublicKeyFromCertPem } from "../utils/rsa-public-key-from-pem";

export class GooglePublicKeysService {
    constructor(private readonly certificatesUrl: string) {}

    /**
     * Gets the current public keys from the certificates url.
     * @returns The array of public keys.
     */
    async getCurrentPublicKeys(): Promise<PublicKey[]> {
        const res = await fetch(this.certificatesUrl);
        if (res.status >= 300 && res.status < 200) throw new Error(`error fetching current public keys ${res.status} ${await res.text()}`);

        const resJson = (await res.json()) as Record<string, string>;

        return Object.values(resJson).map((certificate) => parseRsaPublicKeyFromCertPem(certificate));
    }
}
