import forge from "node-forge";
import { PublicKey } from "../types/attestation.types";

/**
 * Parse a DER-encoded RSA public key and extract its components (n, e).
 * @param derBytes The DER-encoded public key bytes.
 * @returns The public key.
 */
export function parseRsaPublicKeyFromDer(derBytes: Uint8Array): PublicKey {
    // 1) Convert DER bytes to a forge buffer
    const derBuffer = forge.util.createBuffer(Buffer.from(derBytes).toString("binary"));

    // 2) Parse ASN.1 structure and extract public key
    const asn1 = forge.asn1.fromDer(derBuffer);
    const publicKey = forge.pki.publicKeyFromAsn1(asn1) as forge.pki.rsa.PublicKey;

    // 3) Extract RSA components
    let hex = publicKey.n.toString(16);
    if (hex.length % 2 !== 0) hex = "0" + hex;
    const n = Buffer.from(hex, "hex");
    return {
        n: Array.from(new Uint8Array(n)),
        e: publicKey.e.toByteArray(),
    };
}
