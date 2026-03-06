import { PublicKey } from "../../types/attestation.types";
import { parseRsaPublicKeyFromCertPem } from "../../utils/rsa-public-key-from-pem";
import { KeyProvider } from "./key-provider.interface";

export class GoogleKeyProvider implements KeyProvider {
    readonly name = "google";

    constructor(private readonly certificatesUrl: string) {}

    /**
     * Fetches and parses RSA public keys from the Google certificates endpoint.
     * @returns Array of public keys parsed from the Google certificates response.
     */
    async getCurrentPublicKeys(): Promise<PublicKey[]> {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        let res: Response;

        try {
            res = await fetch(this.certificatesUrl, { signal: controller.signal });
        } catch (err) {
            throw new Error(`error fetching current public keys: ${(err as Error).message}`);
        } finally {
            clearTimeout(timeout);
        }

        if (!res.ok) throw new Error(`error fetching current public keys ${res.status} ${await res.text()}`);

        const resJson = (await res.json()) as Record<string, string>;

        return Object.values(resJson).map((certificate) => parseRsaPublicKeyFromCertPem(certificate));
    }
}
