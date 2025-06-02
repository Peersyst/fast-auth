/* eslint-disable @typescript-eslint/ban-ts-comment */
import { useAuth0 } from "@auth0/auth0-react";
import { useFastAuthRelayer } from "../hooks/use-fast-auth-relayer";
import { useState } from "react";
import { Transaction } from "near-api-js/lib/transaction";
import * as jose from "jose";
import { ec as EC } from "elliptic";

export default function SignButton() {
    const { relayer } = useFastAuthRelayer();
    const { getAccessTokenSilently } = useAuth0();

    const [signature, setSignature] = useState("");
    const [tx, setTx] = useState<Transaction | null>(null);

    const handleSign = async () => {
        if (!relayer) {
            throw new Error("Relayer not initialized");
        }
        const jwt = await getAccessTokenSilently();
        const claims = jose.decodeJwt(jwt);
        const tx = Transaction.decode(claims["fatxn"] as Uint8Array<ArrayBufferLike>);
        setTx(tx);
        const result = await relayer?.sign(jwt);

        setSignature(JSON.parse(Buffer.from(result.status.SuccessValue, "base64").toString()));
    };

    const handleSend = async () => {
        if (!signature) throw new Error("no signature");

        const secp256k1 = new EC("secp256k1");

        // Inputs from MPC signer
        // @ts-expect-error
        const compressedR = signature["big_r"]["affine_point"] as string;
        // @ts-expect-error
        const sHex = signature["s"]["scalar"] as string;
        // @ts-expect-error
        const recoveryId = signature["recovery_id"] as number;

        // 1. Decompress big_r to get x (used as r scalar)
        const point = secp256k1.keyFromPublic(compressedR, "hex").getPublic();
        const r = point.getX().toArrayLike(Buffer, "be", 32);

        // 2. s is already the scalar
        const s = Buffer.from(sHex, "hex");

        // 3. Normalize recovery ID
        const v = recoveryId & 0x01; // should be 0 or 1

        // 4. Final 65-byte signature
        const sig = Buffer.concat([r, s, Buffer.from([v])]);

        await relayer?.send(sig, tx as Transaction);
    };

    return (
        <div>
            <button onClick={() => handleSign()}>Sign</button>
            {signature && (
                <div>
                    <p>{JSON.stringify(signature)}</p>
                    <button onClick={() => handleSend()}>Send</button>
                </div>
            )}
        </div>
    );
}
