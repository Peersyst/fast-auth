import { useState, useCallback, useEffect } from "react";
import { PublicKey } from "near-api-js/lib/utils";
import { Transaction } from "near-api-js/lib/transaction";
import { parseNearAmount } from "near-api-js/lib/utils/format";
import { FastAuthSignature } from "@fast-auth-near/browser-sdk";
import { useFastAuth } from "./use-fast-auth-relayer";
import { TransactionState, FastAuthSignerType } from "./types";

interface UseTransactionSignerProps {
    signer: FastAuthSignerType | null;
    publicKey: string | null;
}

export const useTransactionSigner = ({ signer, publicKey }: UseTransactionSignerProps) => {
    const { relayer } = useFastAuth();

    const [state, setState] = useState<TransactionState>({
        signatureRequest: null,
        signature: null,
        txHash: null,
        isSigning: false,
        isSending: false,
        error: null,
    });

    // Check for pending signature requests on mount
    useEffect(() => {
        if (!signer) return;

        const checkPendingSignature = async () => {
            try {
                const signatureRequest = await signer.getSignatureRequest();
                if ("signPayload" in signatureRequest && signatureRequest.signPayload) {
                    setState((prev) => ({ ...prev, signatureRequest }));
                }
            } catch (error) {
                console.error("Failed to check pending signature:", error);
            }
        };

        checkPendingSignature();
    }, [signer]);

    const requestSignature = useCallback(
        async (accountId: string, receiverId: string, amount: string) => {
            if (!signer || !publicKey || !relayer) {
                throw new Error("Signer, public key, or relayer not initialized");
            }

            setState((prev) => ({ ...prev, error: null }));

            try {
                const transaction = await relayer.createTransfer(
                    accountId,
                    PublicKey.fromString(publicKey),
                    receiverId,
                    amount
                );

                if (!transaction) {
                    throw new Error("Failed to create transaction");
                }

                await signer.requestTransactionSignature({
                    imageUrl:
                        "https://example.fast-auth.com/near-logo.png",
                    name: "Peersyst Technology",
                    transaction,
                });

                const signatureRequest = await signer.getSignatureRequest();
                if ("signPayload" in signatureRequest && signatureRequest.signPayload) {
                    setState((prev) => ({ ...prev, signatureRequest }));
                }
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setState((prev) => ({ ...prev, error }));
                throw error;
            }
        },
        [signer, publicKey, relayer]
    );

    const sign = useCallback(async () => {
        if (!signer || !state.signatureRequest || !relayer) {
            throw new Error("Signer, signature request, or relayer not initialized");
        }

        setState((prev) => ({ ...prev, isSigning: true, error: null }));

        try {
            const action = await signer.createSignAction(state.signatureRequest, {
                deposit: BigInt(parseNearAmount("0.01")!),
            });

            if (!action) {
                throw new Error("Failed to create sign action");
            }

            const signature = await relayer.relaySignAction(action);

            setState((prev) => ({
                ...prev,
                signature,
                isSigning: false,
            }));

            return signature;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setState((prev) => ({ ...prev, isSigning: false, error }));
            throw error;
        }
    }, [signer, state.signatureRequest, relayer]);

    const send = useCallback(async () => {
        if (!signer || !state.signature || !state.signatureRequest?.signPayload) {
            throw new Error("Signer, signature, or sign payload not found");
        }

        setState((prev) => ({ ...prev, isSending: true, error: null }));

        try {
            const transaction = Transaction.decode(state.signatureRequest.signPayload);
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            const signature = FastAuthSignature.fromBase64(state.signature.status.SuccessValue);
            const result = await signer.sendTransaction(transaction, signature);

            setState((prev) => ({
                ...prev,
                txHash: result?.transaction.hash || null,
                isSending: false,
            }));

            return result;
        } catch (err) {
            const error = err instanceof Error ? err : new Error(String(err));
            setState((prev) => ({ ...prev, isSending: false, error }));
            throw error;
        }
    }, [signer, state.signature, state.signatureRequest]);

    return {
        ...state,
        requestSignature,
        sign,
        send,
    };
};
