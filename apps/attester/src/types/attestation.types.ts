export type PublicKey = {
    n: number[];
    e: number[];
};

export type Attestation = {
    public_keys: PublicKey[];
    hash: string;
};
