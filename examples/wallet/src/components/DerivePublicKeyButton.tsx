import { useState } from "react";
import { useFastAuthRelayer } from "../hooks/use-fast-auth-relayer";
import { encodeTransaction } from "near-api-js/lib/transaction";
import { useAuth0 } from "@auth0/auth0-react";
import { PublicKey } from "near-api-js/lib/utils";
import SignButton from "./SignButton";
import CreateAccount from "./CreateAccount";

export default function DerivePublicKeyButton({ sub }: { sub: string }) {
    const { loginWithRedirect } = useAuth0();
    const { relayer } = useFastAuthRelayer();
    const [publicKey, setPublicKey] = useState<string | null>(null);

    const handleClick = async () => {
        if (!relayer) {
            throw new Error("Relayer not initialized");
        }
        const publicKey = await relayer?.derivePublicKey(sub);
        setPublicKey(publicKey);
    };

    const handleTransfer = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!relayer) {
            throw new Error("Relayer not initialized");
        }
        if (!publicKey) {
            throw new Error("Public key not derived");
        }
        const formData = new FormData(e.target as HTMLFormElement);
        const accountId = formData.get("accountid") as string;
        const receiverId = formData.get("receiverid") as string;
        const amount = formData.get("amount") as string;
        const tx = await relayer?.createTransfer(accountId, PublicKey.fromString(publicKey), receiverId, amount);
        const messageBytes: number[] = [];
        encodeTransaction(tx).forEach((b) => {
            messageBytes.push(b);
        });

        await loginWithRedirect({
            authorizationParams: {
                imageUrl:
                    "https://media.licdn.com/dms/image/v2/D4D0BAQH5KL-Ge_0iug/company-logo_200_200/company-logo_200_200/0/1696280807541/peersyst_technology_logo?e=2147483647&v=beta&t=uFYvQ5g6HDoIprYhNNV_zC7tzlBkvmPRkWzuLuDpHtc",
                name: "Peersyst Technology",
                transaction: messageBytes,
            },
        });
    };

    return (
        <div>
            <button onClick={handleClick}>Derive Public Key</button>
            {publicKey && (
                <div>
                    <p>Public Key: {JSON.stringify(publicKey)}</p>
                    <CreateAccount publicKey={publicKey} />
                    <form onSubmit={handleTransfer}>
                        <input type="text" placeholder="Enter Account ID" name="accountid" />
                        <input type="text" placeholder="Enter Receiver ID" name="receiverid" />
                        <input type="text" placeholder="Enter Amount" name="amount" />
                        <button type="submit">Transfer</button>
                    </form>
                </div>
            )}
            <SignButton />
        </div>
    );
}
