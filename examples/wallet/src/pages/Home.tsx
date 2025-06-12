import { Fragment, useEffect, useState } from "react";
import "./Home.css";
import { useFastAuth } from "../hooks/use-fast-auth-relayer";
import LoginButton from "../components/LoginButton";
import { LogoutButton } from "../components/LogoutButton";
import { FastAuthSigner, FastAuthSignature, SignatureRequest, Auth0Provider } from "@fast-auth/sdk";
import { PublicKey } from "near-api-js/lib/utils";
import { Transaction } from "near-api-js/lib/transaction";

const Home: React.FC = () => {
    const { isClientInitialized, error, client, relayer } = useFastAuth();

    const [loggedIn, setLoggedIn] = useState(false);
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [signer, setSigner] = useState<FastAuthSigner<Auth0Provider> | null>(null);
    const [signatureRequest, setSignatureRequest] = useState<SignatureRequest | null>(null);
    const [result, setResult] = useState(null);

    useEffect(() => {
        if (isClientInitialized) {
            client?.getSigner().then((signer) => {
                setSigner(signer);
                if (signer) {
                    signer
                        .getPublicKey()
                        .then((publicKey) => {
                            setPublicKey(publicKey.toString());
                            setLoggedIn(true);
                        })
                        .catch((error) => {
                            setLoggedIn(false);
                            console.error(error);
                        });

                    signer
                        ?.getSignatureRequest()
                        .then((signatureRequest) => {
                            setSignatureRequest(signatureRequest);
                        })
                        .catch((error) => {
                            console.error(error);
                        });
                }
            });
        }
    }, [isClientInitialized, client, relayer]);

    const requestTransactionSignature = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const accountId = formData.get("accountid") as string;
        const receiverId = formData.get("receiverid") as string;
        const amount = formData.get("amount") as string;
        const tx = await relayer?.createTransfer(accountId, PublicKey.fromString(publicKey!), receiverId, amount);
        if (!tx) {
            throw new Error("Transaction not created");
        }
        await signer?.requestTransactionSignature({
            redirectUri: "http://localhost:3000",
            imageUrl:
                "https://media.licdn.com/dms/image/v2/D4D0BAQH5KL-Ge_0iug/company-logo_200_200/company-logo_200_200/0/1696280807541/peersyst_technology_logo?e=2147483647&v=beta&t=uFYvQ5g6HDoIprYhNNV_zC7tzlBkvmPRkWzuLuDpHtc",
            name: "Peersyst Technology",
            transaction: tx,
        });
    };

    const handleCreateAccount = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.target as HTMLFormElement);
        const accountId = formData.get("accountid") as string;
        const action = await signer?.createAccount(accountId);
        if (!action) {
            throw new Error("Action not created");
        }
        await relayer?.createAccount(action);
    };

    const handleSignTransaction = async () => {
        if (!signatureRequest) {
            throw new Error("Signature request not found");
        }
        const action = await signer?.createSignAction(signatureRequest);
        if (!action) {
            throw new Error("Action not created");
        }
        const result = await relayer?.relaySignAction(action);
        setResult(result);
    };

    const handleSendTransaction = async () => {
        if (!result || !signatureRequest?.signPayload) {
            throw new Error("Result or sign payload not found");
        }
        const tx = Transaction.decode(signatureRequest?.signPayload);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const signature = FastAuthSignature.fromBase64(result.status.SuccessValue);
        await signer?.sendTransaction(tx, signature);
    };

    return (
        <Fragment>
            <h1>FastAuth Wallet</h1>
            <p>
                This is a sample application that demonstrates how to interact with the FastAuth contract to sign transactions through the
                MPC.
            </p>

            {loggedIn && publicKey && (
                <div>
                    <p>You're logged in</p>
                    <p>Public Key: {publicKey}</p>
                    <form onSubmit={handleCreateAccount}>
                        <input type="text" placeholder="Enter account ID" name="accountid" />
                        <button type="submit">Create Account</button>
                    </form>

                    <form onSubmit={requestTransactionSignature}>
                        <input type="text" placeholder="Enter Account ID" name="accountid" />
                        <input type="text" placeholder="Enter Receiver ID" name="receiverid" />
                        <input type="text" placeholder="Enter Amount" name="amount" />
                        <button type="submit">Transfer</button>
                    </form>

                    {signatureRequest && (
                        <div>
                            <p>
                                Signature Request:{" "}
                                {JSON.stringify(signatureRequest, (_, value) => (typeof value === "bigint" ? value.toString() : value))}
                            </p>
                            <button onClick={handleSignTransaction}>Sign Transaction</button>
                        </div>
                    )}
                    {result && <button onClick={handleSendTransaction}>Send Transaction</button>}
                </div>
            )}
            {loggedIn ? <LogoutButton /> : <LoginButton />}
            {error && <p>Error: {error.message}</p>}
        </Fragment>
    );
};

export default Home;
