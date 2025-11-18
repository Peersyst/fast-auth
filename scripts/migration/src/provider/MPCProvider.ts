import { createHash } from "node:crypto";
import { serialize } from "near-api-js/lib/utils";
import { Schema } from "borsh";
import { KeyPair } from "near-api-js";
import { DelegateAction, SCHEMA } from "@near-js/transactions";

export type UserCredentialRequest = {
    oidc_token: unknown;
    frp_signature: string;
    frp_public_key: string;
};

export type UserCredentialResponse = {
    recovery_pk: string;
};

export type SignRequest = {
    delegate_action: unknown;
    oidc_token: unknown;
    frp_signature: string;
    user_credentials_frp_signature: string;
    frp_public_key: string;
};

export type SignResponse = {
    signature: string;
};

export type CreateNewAccountRequest = {
    near_account_id: string;
    create_account_options: unknown;
    oidc_token: unknown;
    user_credentials_frp_signature: unknown;
    frp_public_key: unknown;
};

export type CreateNewAccountResponse = {
    create_account_options: unknown;
    recovery_public_key: unknown;
    near_account_id: string;
};

export type ClaimOIDCTokenRequest = {
    oidc_token_hash: unknown;
    frp_public_key: unknown;
    frp_signature: unknown;
};

export type ClaimOIDCTokenResponse = {
    mpc_signature: string;
};

class BytesBox {
    constructor(public data: Uint8Array) {}
}

const U8_32: Schema = {
    struct: {
        data: { array: { type: "u8", len: 32 } },
    },
};

const U8_ARRAY: Schema = {
    struct: {
        data: { array: { type: "u8" } },
    },
};

export class MPCProvider {
    private readonly frpKeyPair: KeyPair;
    constructor(
        private readonly baseUrl: string,
        frpPrivateKey: string,
        private readonly salt: number,
    ) {
        this.frpKeyPair = KeyPair.fromString(frpPrivateKey);
    }

    /**
     *
     * @param jwt
     */
    async userCredentials(jwt: string): Promise<UserCredentialResponse> {
        return this.request("/user_credentials", {
            oidc_token: jwt,
            frp_public_key: this.frpKeyPair.getPublicKey().toString(),
            frp_signature: await this.frpSignatureCredentials(jwt),
        } as UserCredentialRequest);
    }

    /**
     *
     * @param jwt
     * @param delegateAction
     */
    async sign(jwt: string, delegateAction: DelegateAction): Promise<SignResponse> {
        const serializedDelegateAction = serialize.serialize(SCHEMA.DelegateAction, delegateAction);
        return this.request("/sign", {
            delegate_action: Buffer.from(serializedDelegateAction).toString("base64"),
            oidc_token: jwt,
            frp_signature: await this.frpSignatureSign(jwt, serializedDelegateAction),
            user_credentials_frp_signature: await this.frpSignatureCredentials(jwt),
            frp_public_key: this.frpKeyPair.getPublicKey().toString(),
        });
    }

    /**
     *
     * @param jwt
     * @param accountId
     */
    async createNewAccount(jwt: string, accountId: string): Promise<CreateNewAccountResponse> {
        return this.request("/new_account", {
            near_account_id: accountId,
            create_account_options: {},
            oidc_token: jwt,
            user_credentials_frp_signature: await this.frpSignatureCredentials(jwt),
            frp_public_key: this.frpKeyPair.getPublicKey().toString(),
        } as CreateNewAccountRequest);
    }

    /**
     *
     * @param jwt
     */
    async claimOidcToken(jwt: string): Promise<ClaimOIDCTokenResponse> {
        return this.request("/claim_oidc", {
            oidc_token_hash: Buffer.from(await this.hashToken(jwt)).toString("hex"),
            frp_public_key: this.frpKeyPair.getPublicKey().toString(),
            frp_signature: await this.frpSignature(jwt),
        } as ClaimOIDCTokenRequest);
    }

    /**
     *
     * @param jwt
     */
    private async hashToken(jwt: string): Promise<Uint8Array> {
        const hexHash = createHash("sha256").update(jwt).digest("hex");
        return new Uint8Array(Buffer.from(hexHash, "hex"));
    }

    /**
     *
     * @param bytesArray
     */
    private async signBytes(bytesArray: Uint8Array[]): Promise<string> {
        const totalLength = bytesArray.reduce((a, b) => a + b.length, 0);
        const combined = new Uint8Array(totalLength);
        let currentLength = 0;
        for (const bytes of bytesArray) {
            combined.set(bytes, currentLength);
            currentLength += bytes.length;
        }
        const hash = createHash("sha256").update(combined).digest();

        const signature = this.frpKeyPair.sign(hash);
        return Buffer.from(signature.signature).toString("hex");
    }

    /**
     *
     * @param jwt
     */
    private async frpSignature(jwt: string): Promise<string> {
        const saltSerialized = serialize.serialize("u32", this.salt); // or your schema for u32
        const oidcSerialized = serialize.serialize(U8_32, new BytesBox(await this.hashToken(jwt)));
        const zeroByte = new Uint8Array([0]);
        const frpSerialized = serialize.serialize(U8_32, new BytesBox(this.frpKeyPair.getPublicKey().data));
        return this.signBytes([saltSerialized, oidcSerialized, zeroByte, frpSerialized]);
    }

    /**
     *
     * @param jwt
     * @param delegateAction
     */
    private async frpSignatureSign(jwt: string, delegateAction: Uint8Array): Promise<string> {
        const saltSerialized = serialize.serialize("u32", this.salt + 3); // or your schema for u32
        const delegateSerialized = delegateAction;
        const oidcSerialized = serialize.serialize(U8_ARRAY, new BytesBox(Buffer.from(jwt)));
        const zeroByte = new Uint8Array([0]);
        const frpSerialized = serialize.serialize(U8_32, new BytesBox(this.frpKeyPair.getPublicKey().data));
        return this.signBytes([saltSerialized, delegateSerialized, oidcSerialized, zeroByte, frpSerialized]);
    }

    /**
     *
     * @param jwt
     */
    private async frpSignatureCredentials(jwt: string): Promise<string> {
        const saltSerialized = serialize.serialize("u32", this.salt + 2); // or your schema for u32
        const oidcSerialized = serialize.serialize(U8_ARRAY, new BytesBox(Buffer.from(jwt)));
        const zeroByte = new Uint8Array([0]);
        const frpSerialized = serialize.serialize(U8_32, new BytesBox(this.frpKeyPair.getPublicKey().data));
        return this.signBytes([saltSerialized, oidcSerialized, zeroByte, frpSerialized]);
    }

    /**
     *
     * @param path
     * @param request
     */
    private async request(path: string, request: object): Promise<any> {
        const res = await fetch(`${this.baseUrl}${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
        });

        if (res.status >= 300) {
            throw new Error(await res.text());
        }

        return res.json();
    }
}
