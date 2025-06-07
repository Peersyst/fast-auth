export interface FastAuthSigner {
    createAccount(): void;
    requestSignature(): void;
    sign(): void;
    signAndSend(): void;
    getPublicKey(): string;
}
