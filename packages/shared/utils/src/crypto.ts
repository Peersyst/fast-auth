import { encrypt, decrypt, utf8ToBytes } from "@noble/ciphers/simple";

/**
 * Encrypts payload data using a simple reversible encryption that hides the original data.
 * @param key The encryption key.
 * @param data The data to encrypt (will be converted to string).
 * @returns An encrypted string that can be decrypted.
 */
export async function encryptPayload(key: string, data: any): Promise<string> {
    // Create a 32-byte key from the provided key
    const keyBytes = new TextEncoder().encode(key);
    const encryptionKey = new Uint8Array(32);

    // Fill the key array, repeating the original key if needed
    for (let i = 0; i < 32; i++) {
        encryptionKey[i] = keyBytes[i % keyBytes.length];
    }

    const plaintext = utf8ToBytes(JSON.stringify(data));
    const ciphertext = encrypt(encryptionKey, plaintext);

    const encrypted = Buffer.from(ciphertext).toString("base64");

    return encrypted;
}

/**
 * Decrypts a payload.
 * @param key The encryption key.
 * @param data The encrypted payload to decrypt.
 * @returns The decrypted payload.
 */
export async function decryptPayload(key: string, data: string): Promise<any> {
    // Create a 32-byte key from the provided key (same as encryption)
    const keyBytes = new TextEncoder().encode(key);
    const encryptionKey = new Uint8Array(32);

    // Fill the key array, repeating the original key if needed
    for (let i = 0; i < 32; i++) {
        encryptionKey[i] = keyBytes[i % keyBytes.length];
    }

    const cipherText = Buffer.from(data, "base64");

    const plaintext = decrypt(encryptionKey, cipherText);

    const jsonString = new TextDecoder().decode(plaintext);

    return JSON.parse(jsonString);
}
