import { useState, useEffect } from "react";
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
    const { isClientInitialized, client, relayer } = useFastAuth();

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

    // Check for existing login state and signature requests (popup-based, no redirect handling)
    useEffect(() => {
        if (isClientInitialized && client) {
            const checkAuthState = async () => {
                try {
                    const signer = await client.getSigner();
                    setSigner(signer);
                    
                    const publicKey = await signer.getPublicKey();
                    setPublicKey(publicKey.toString());
                    setLoggedIn(true);
                    
                    // Check for pending signature request
                    try {
                        const signatureRequest = await signer.getSignatureRequest();
                        if ("signPayload" in signatureRequest && signatureRequest.signPayload) {
                            setSignatureRequest(signatureRequest);
                            setExpandedStep(3);
                        }
                    } catch (error) {
                        // No signature request pending
                        console.debug("No signature request found");
                    }
                } catch (error) {
                    // User not logged in - this is expected for popup flows
                    setLoggedIn(false);
                    setSigner(null);
                }
            };
            
            checkAuthState();
        }
    }, [isClientInitialized, client]);

    const handleLogin = async () => {
        if (!client) {
            throw new Error("Client not initialized");
        }
        
        try {
            // Call login with popup (no redirectUri means popup flow)
            // The promise resolves when the popup completes
            await client.login();

            console.log("login successful");
            
            // After popup closes, check if login was successful
            // The login promise resolves when authentication is complete
            const signer = await client.getSigner();
            setSigner(signer);
            const publicKey = await signer.getPublicKey();
            setPublicKey(publicKey.toString());
            setLoggedIn(true);
            setExpandedStep(1);
        } catch (error) {
            console.error("Login failed:", error);
            setLoggedIn(false);
            throw error;
        }
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
        if (!signer || !relayer) {
            throw new Error("Signer or relayer not initialized");
        }
        
        const tx = await relayer.createTransfer(accountId, PublicKey.fromString(publicKey!), receiverId, amount);
        if (!tx) {
            throw new Error("Transaction not created");
        }
        
        // Request signature via popup (no redirectUri means popup flow)
        // The promise resolves when the popup completes
        await signer.requestTransactionSignature({
            imageUrl:
                "https://media.licdn.com/dms/image/v2/D4D0BAQH5KL-Ge_0iug/company-logo_200_200/company-logo_200_200/0/1696280807541/peersyst_technology_logo?e=2147483647&v=beta&t=uFYvQ5g6HDoIprYhNNV_zC7tzlBkvmPRkWzuLuDpHtc",
            name: "Peersyst Technology",
            transaction: tx,
        });
        
        setTransferRequested(true);
        
        // After popup closes, check for signature request
        // The requestTransactionSignature promise resolves when signature is complete
        try {
            const signatureRequest = await signer.getSignatureRequest();
            if ("signPayload" in signatureRequest && signatureRequest.signPayload) {
                setSignatureRequest(signatureRequest);
                setExpandedStep(3);
            }
        } catch (error) {
            console.error("Failed to get signature request:", error);
        }
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
