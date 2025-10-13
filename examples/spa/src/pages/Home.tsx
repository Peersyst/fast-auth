import { useEffect, useState } from "react";
import "./Home.css";
import { useFastAuth } from "../hooks/use-fast-auth-relayer";
import LoginButton from "../components/LoginButton";
import { LogoutButton } from "../components/LogoutButton";
import { FastAuthSigner, FastAuthSignature, SignatureRequest, Auth0Provider } from "@fast-auth/browser";
import { PublicKey } from "near-api-js/lib/utils";
import { Transaction } from "near-api-js/lib/transaction";
import Accordion from "../components/Accordion";
import Spinner from "../components/Spinner";
import { parseNearAmount } from "near-api-js/lib/utils/format";

const Home: React.FC = () => {
    const { isClientInitialized, error, client, relayer } = useFastAuth();

    const [loggedIn, setLoggedIn] = useState(false);
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [signer, setSigner] = useState<FastAuthSigner<Auth0Provider> | null>(null);
    const [signatureRequest, setSignatureRequest] = useState<SignatureRequest | null>(null);
    const [result, setResult] = useState(null);
    const [accountCreated, setAccountCreated] = useState(false);
    const [transferRequested, setTransferRequested] = useState(false);
    const [transactionSigned, setTransactionSigned] = useState(false);
    const [expandedStep, setExpandedStep] = useState(0); // 0:Login, 1:Create, 2:Transfer, 3:Sign, 4:Send
    const [signing, setSigning] = useState(false);
    const [sending, setSending] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);

    useEffect(() => {
        if (isClientInitialized) {
            client?.getSigner().then((signer: FastAuthSigner<Auth0Provider>) => {
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
                    
                        console.log("signer", signer);
                    signer
                        ?.getSignatureRequest()
                        .then((signatureRequest) => {
                            console.log("signatureRequest", signatureRequest);
                            if ("signPayload" in signatureRequest && signatureRequest.signPayload) {
                                setSignatureRequest(signatureRequest);
                                setExpandedStep(3);
                            }
                        })
                        .catch((error) => {
                            console.error(error);
                        });
                }
            });
        }
    }, [isClientInitialized, client, relayer]);

    const handleLogin = async () => {
        // Login handled by LoginButton
        setExpandedStep(1);
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
        setAccountCreated(true);
        setExpandedStep(2);
    };

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
            // redirectUri: "http://localhost:3000",
            imageUrl:
                "https://media.licdn.com/dms/image/v2/D4D0BAQH5KL-Ge_0iug/company-logo_200_200/company-logo_200_200/0/1696280807541/peersyst_technology_logo?e=2147483647&v=beta&t=uFYvQ5g6HDoIprYhNNV_zC7tzlBkvmPRkWzuLuDpHtc",
            name: "Peersyst Technology",
            transaction: tx,
        });
        setTransferRequested(true);
    };

    const handleSignTransaction = async () => {
        if (!signatureRequest) {
            throw new Error("Signature request not found");
        }
        setSigning(true);
        try {
            const action = await signer?.createSignAction(signatureRequest, { deposit: BigInt(parseNearAmount("1")!) });
            if (!action) {
                throw new Error("Action not created");
            }
            const result = await relayer?.relaySignAction(action);
            setResult(result);
            setTransactionSigned(true);
            setExpandedStep(4);
        } finally {
            setSigning(false);
        }
    };

    const handleSendTransaction = async () => {
        if (!result || !signatureRequest?.signPayload) {
            throw new Error("Result or sign payload not found");
        }
        setSending(true);
        try {
            console.log("result", result);
            console.log("signatureRequest", signatureRequest);
            const tx = Transaction.decode(signatureRequest?.signPayload);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const signature = FastAuthSignature.fromBase64(result.status.SuccessValue);
            const txResult = await signer?.sendTransaction(tx, signature);
            console.log(txResult);
            setTxHash(txResult?.transaction.hash);
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="home-page">
            <h1>FastAuth integration</h1>
            <p>
                This is a sample application that demonstrates how to interact with the FastAuth contract to sign transactions through the
                MPC.
            </p>
            <Accordion title="1. Login" expanded={expandedStep === 0} onClick={() => setExpandedStep(0)}>
                {loggedIn ? (
                    <div className="info-row">
                        <p>Public Key: {publicKey}</p>
                        <LogoutButton />
                        <button style={{ marginLeft: 8 }} onClick={handleLogin}>
                            Create Account
                        </button>
                    </div>
                ) : (
                    <LoginButton />
                )}
            </Accordion>
            <Accordion title="2. Create Account" expanded={expandedStep === 1} onClick={() => loggedIn && setExpandedStep(1)}>
                <form onSubmit={handleCreateAccount}>
                    <div className="info-row">
                        <input type="text" placeholder="Enter account ID" name="accountid" required />
                        <button type="submit">Create Account</button>
                        <p>or</p>
                        <button onClick={() => setExpandedStep(2)}>Skip to request transaction approval</button>
                    </div>
                </form>
                {accountCreated && <p>Account created!</p>}
            </Accordion>
            <Accordion
                title="3. Request Transaction Approval"
                expanded={expandedStep === 2}
                onClick={() => accountCreated && setExpandedStep(2)}
            >
                <form onSubmit={requestTransactionSignature}>
                    <label className="info-label">
                        Account ID
                        <input type="text" placeholder="Enter Account ID" name="accountid" required />
                    </label>
                    <label className="info-label">
                        Receiver ID
                        <input type="text" placeholder="Enter Receiver ID" name="receiverid" required />
                    </label>
                    <label className="info-label">
                        Amount
                        <input type="text" placeholder="Enter Amount" name="amount" required />
                    </label>
                    <button type="submit">Request</button>
                </form>
                {transferRequested && <p>Requesting transaction approval...</p>}
            </Accordion>
            <Accordion title="4. Sign Transaction" expanded={expandedStep === 3} onClick={() => transferRequested && setExpandedStep(3)}>
                {signatureRequest && (
                    <div>
                        <p>
                            Signature Request:{" "}
                            {JSON.stringify(
                                Transaction.decode(signatureRequest.signPayload),
                                (_, value) => (typeof value === "bigint" ? value.toString() : value),
                                2,
                            )}
                        </p>
                        <button onClick={handleSignTransaction} disabled={signing}>
                            {signing ? <Spinner size={18} /> : "Sign Transaction"}
                        </button>
                    </div>
                )}
                {transactionSigned && <p>Transaction signed!</p>}
            </Accordion>
            <Accordion title="5. Broadcast" expanded={expandedStep === 4} onClick={() => transactionSigned && setExpandedStep(4)}>
                {result && (
                    <div>
                        <p>To finish the transaction, you need to send it to the network.</p>
                        <button onClick={handleSendTransaction} disabled={sending}>
                            {sending ? <Spinner size={18} /> : "Send Transaction"}
                        </button>
                        {txHash && (
                            <p>
                                Transaction hash:{" "}
                                <a href={`https://testnet.nearblocks.io/txns/${txHash}`} target="_blank" rel="noopener noreferrer">
                                    {txHash}
                                </a>
                            </p>
                        )}
                    </div>
                )}
            </Accordion>
            {error && <p>Error: {error.message}</p>}
        </div>
    );
};

export default Home;
