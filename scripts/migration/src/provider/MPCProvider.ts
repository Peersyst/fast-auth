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
            frp_signature: await this.frpSignatureCredentials(jwt),
            user_credentials_frp_signature: await this.frpSignatureCredentials(jwt),
            frp_public_key: this.frpKeyPair.getPublicKey().toString(),
        });
    }

    /**
     *
     * @param request
     */
    async createNewAccount(request: CreateNewAccountRequest): Promise<CreateNewAccountResponse> {
        return this.request("/new_account", request);
    }

    /**
     *
     * @param jwt
     */
    async claimOidcToken(jwt: string): Promise<ClaimOIDCTokenResponse> {
        return this.request("/claim_oidc", {
            oidc_token_hash: Buffer.from(await this.hashToken(jwt)).toString("hex"),
            frp_public_key: this.frpKeyPair.getPublicKey().toString(),
            frp_signature: await this.frpSignature(jwt, 0),
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
     * @param jwt
     * @param saltOffset
     */
    private async frpSignature(jwt: string, saltOffset: number): Promise<string> {
        const saltSerialized = serialize.serialize("u32", this.salt + saltOffset); // or your schema for u32
        const oidcSerialized = serialize.serialize(U8_32, new BytesBox(await this.hashToken(jwt)));
        const zeroByte = new Uint8Array([0]);
        const frpSerialized = serialize.serialize(U8_32, new BytesBox(this.frpKeyPair.getPublicKey().data));
        const combined = new Uint8Array(saltSerialized.length + oidcSerialized.length + zeroByte.length + frpSerialized.length);
        combined.set(saltSerialized, 0);
        combined.set(oidcSerialized, saltSerialized.length);
        combined.set(zeroByte, saltSerialized.length + oidcSerialized.length);
        combined.set(frpSerialized, saltSerialized.length + oidcSerialized.length + zeroByte.length);
        const hash = createHash("sha256").update(combined).digest();

        const signature = this.frpKeyPair.sign(hash);
        return Buffer.from(signature.signature).toString("hex");
    }

    /**
     *
     * @param jwt
     */
    private async frpSignatureCredentials(jwt: string): Promise<string> {
        const saltSerialized = serialize.serialize("u32", this.salt + 2); // or your schema for u32
        const oidcSerialized = serialize.serialize(U8_ARRAY, new BytesBox(Buffer.from(jwt, "base64")));
        const zeroByte = new Uint8Array([0]);
        const frpSerialized = serialize.serialize(U8_32, new BytesBox(this.frpKeyPair.getPublicKey().data));
        const combined = new Uint8Array(saltSerialized.length + oidcSerialized.length + zeroByte.length + frpSerialized.length);
        combined.set(saltSerialized, 0);
        combined.set(oidcSerialized, saltSerialized.length);
        combined.set(zeroByte, saltSerialized.length + oidcSerialized.length);
        combined.set(frpSerialized, saltSerialized.length + oidcSerialized.length + zeroByte.length);
        const hash = createHash("sha256").update(combined).digest();

        const signature = this.frpKeyPair.sign(hash);
        return Buffer.from(signature.signature).toString("hex");
    }

    /**
     *
     * @param path
     * @param request
     */
    private async request(path: string, request: object): Promise<any> {
        console.log(request);
        const res = await fetch(`${this.baseUrl}${path}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(request),
        });

        return res.json();
    }
}
