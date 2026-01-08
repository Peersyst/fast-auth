import forge from "node-forge";
import { PublicKey } from "../types/attestation.types";

/**
 * Parse an X.509 PEM certificate and log RSA public key components (n, e) and PEM.
 * @param certPem The certificate pem to parse.
 * @returns The public key.
 */
export function parseRsaPublicKeyFromCertPem(certPem: string): PublicKey {
    // 1) Parse the certificate
    let cert: forge.pki.Certificate;
    try {
        cert = forge.pki.certificateFromPem(certPem);
    } catch (err) {
        throw new Error(`Invalid certificate PEM: ${(err as Error).message}`);
    }

    // 2) Extract public key
    const pubKey = cert.publicKey;

    // 3) Ensure it's RSA
    const isRsa =
        typeof (pubKey as any).n !== "undefined" &&
        typeof (pubKey as any).e !== "undefined" &&
        typeof (pubKey as any).encrypt === "function";

    if (!isRsa) {
        throw new Error("Certificate public key is not RSA (or unsupported by node-forge).");
    }

    const rsa = pubKey as forge.pki.rsa.PublicKey;
    const n = Buffer.from(rsa.n.toString(16), "hex");
    return {
        n: Array.from(new Uint8Array(n)),
        e: rsa.e.toByteArray(),
    };
}
