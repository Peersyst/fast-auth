export type PublicKey = {
    n: number[];
    e: number[];
};

export type Attestation = {
    publicKeys: PublicKey[];
    hash: string;
};
