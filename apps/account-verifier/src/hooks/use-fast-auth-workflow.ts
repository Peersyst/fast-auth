import { useState, useEffect, useCallback } from "react";
import { useFastAuth } from "./use-fast-auth-relayer";
import { FastAuthSigner, FastAuthSignature, SignatureRequest } from "@fast-auth/browser-sdk";
import { JavascriptProvider } from "@fast-auth/javascript-provider";
import { PublicKey } from "near-api-js/lib/utils";
import { Transaction } from "near-api-js/lib/transaction";
import { parseNearAmount } from "near-api-js/lib/utils/format";

export interface WorkflowState {
    loggedIn: boolean;
    publicKey: string | null;
    signer: FastAuthSigner<JavascriptProvider> | null;
    signatureRequest: SignatureRequest | null;
    result: any;
    accountCreated: boolean;
    transferRequested: boolean;
    transactionSigned: boolean;
    expandedStep: number;
    signing: boolean;
    sending: boolean;
    txHash: string | null;
}

export interface WorkflowActions {
    setExpandedStep: (step: number) => void;
    handleLogin: () => Promise<void>;
    handleCreateAccount: (accountId: string) => Promise<void>;
    requestTransactionSignature: (accountId: string, receiverId: string, amount: string) => Promise<void>;
    handleSignTransaction: () => Promise<void>;
    handleSendTransaction: () => Promise<void>;
}

export const useFastAuthWorkflow = (): WorkflowState & WorkflowActions => {
    const { isClientInitialized, client, relayer, network } = useFastAuth();

    const [loggedIn, setLoggedIn] = useState(false);
    const [publicKey, setPublicKey] = useState<string | null>(null);
    const [signer, setSigner] = useState<FastAuthSigner<JavascriptProvider> | null>(null);
    const [signatureRequest, setSignatureRequest] = useState<SignatureRequest | null>(null);
    const [result, setResult] = useState(null);
    const [accountCreated, setAccountCreated] = useState(false);
    const [transferRequested, setTransferRequested] = useState(false);
    const [transactionSigned, setTransactionSigned] = useState(false);
    const [expandedStep, setExpandedStep] = useState(0);
    const [signing, setSigning] = useState(false);
    const [sending, setSending] = useState(false);
    const [txHash, setTxHash] = useState<string | null>(null);

    const fetchPublicKey = useCallback(async () => {
        if (!isClientInitialized || !client) {
            setLoggedIn(false);
            setPublicKey(null);
            setSigner(null);
            return;
        }

        try {
            const signerInstance = await client.getSigner();
            setSigner(signerInstance);
            if (signerInstance) {
                const publicKeyValue = await signerInstance.getPublicKey();
                setPublicKey(publicKeyValue.toString());
                setLoggedIn(true);
                
                signerInstance
                    ?.getSignatureRequest()
                    .then((signatureRequest) => {
                        if ("signPayload" in signatureRequest && signatureRequest.signPayload) {
                            setSignatureRequest(signatureRequest);
                            setExpandedStep(3);
                        }
                    })
                    .catch((error) => {
                        console.error(error);
                    });
            }
        } catch (error) {
            setLoggedIn(false);
            setPublicKey(null);
            setSigner(null);
            console.error(error);
        }
    }, [isClientInitialized, client, relayer, network]);

    useEffect(() => {
        fetchPublicKey();
    }, [fetchPublicKey]);

    const handleLogin = async () => {
        setExpandedStep(1);
    };

    const handleCreateAccount = async (accountId: string) => {
        const action = await signer?.createAccount(accountId);
        if (!action) {
            throw new Error("Action not created");
        }
        await relayer?.createAccount(action);
        setAccountCreated(true);
        setExpandedStep(2);
    };

    const requestTransactionSignature = async (accountId: string, receiverId: string, amount: string) => {
        const tx = await relayer?.createTransfer(accountId, PublicKey.fromString(publicKey!), receiverId, amount);
        if (!tx) {
            throw new Error("Transaction not created");
        }
        await signer?.requestTransactionSignature({
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
            const action = await signer?.createSignAction(signatureRequest, { deposit: BigInt(parseNearAmount("0.01")!) });
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
            const tx = Transaction.decode(signatureRequest?.signPayload);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const signature = FastAuthSignature.fromBase64(result.status.SuccessValue);
            const txResult = await signer?.sendTransaction(tx, signature);
            setTxHash(txResult?.transaction.hash);
        } finally {
            setSending(false);
        }
    };

    return {
        // State
        loggedIn,
        publicKey,
        signer,
        signatureRequest,
        result,
        accountCreated,
        transferRequested,
        transactionSigned,
        expandedStep,
        signing,
        sending,
        txHash,
        // Actions
        setExpandedStep,
        handleLogin,
        handleCreateAccount,
        requestTransactionSignature,
        handleSignTransaction,
        handleSendTransaction,
    };
};
