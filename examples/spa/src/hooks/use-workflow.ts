import { useState, useEffect } from "react";
import { useAuth } from "./use-auth";
import { useAccountManager } from "./use-account-manager";
import { useTransactionSigner } from "./use-transaction-signer";

export const useWorkflow = () => {
    const [expandedStep, setExpandedStep] = useState(0);

    // Authentication
    const auth = useAuth();

    // Account Management
    const account = useAccountManager({ signer: auth.signer });

    // Transaction Signing
    const transaction = useTransactionSigner({
        signer: auth.signer,
        publicKey: auth.publicKey,
    });

    const loggedIn = auth.isAuthenticated;
    const accountCreated = account.isCreated;
    const selectedAccountId = account.accountId;
    const transferRequested = transaction.signatureRequest !== null;
    const transactionSigned = transaction.signature !== null;

    useEffect(() => {
        if (loggedIn && expandedStep === 0) {
            setExpandedStep(1);
        }
    }, [loggedIn, expandedStep]);

    useEffect(() => {
        if (transferRequested && transaction.signatureRequest) {
            setExpandedStep(3);
        }
    }, [transferRequested, transaction.signatureRequest]);

    useEffect(() => {
        if (transactionSigned) {
            setExpandedStep(4);
        }
    }, [transactionSigned]);

    return {
        // Auth state
        loggedIn,
        publicKey: auth.publicKey,
        signer: auth.signer,

        // Account state
        accountCreated,
        selectedAccountId,

        // Transaction state
        signatureRequest: transaction.signatureRequest,
        result: transaction.signature,
        transferRequested,
        transactionSigned,
        txHash: transaction.txHash,

        // Loading states
        signing: transaction.isSigning,
        sending: transaction.isSending,

        // UI state
        expandedStep,
        setExpandedStep,

        // Actions
        handleLogin: auth.login,
        handleCreateAccount: async (accountId: string) => {
            await account.createAccount(accountId);
            setExpandedStep(2);
        },
        handleSelectAccount: (accountId: string) => {
            account.selectAccount(accountId);
            setExpandedStep(2);
        },
        requestTransactionSignature: transaction.requestSignature,
        handleSignTransaction: transaction.sign,
        handleSendTransaction: transaction.send,
    };
};
