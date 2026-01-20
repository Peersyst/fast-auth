import { useState, useCallback } from "react";
import { useFastAuth } from "./use-fast-auth-relayer";
import { AccountState, FastAuthSignerType } from "./types";

interface UseAccountManagerProps {
    signer: FastAuthSignerType | null;
}

export const useAccountManager = ({ signer }: UseAccountManagerProps) => {
    const { relayer } = useFastAuth();

    const [state, setState] = useState<AccountState>({
        accountId: null,
        isCreated: false,
    });

    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    const createAccount = useCallback(
        async (accountId: string) => {
            if (!signer || !relayer) {
                throw new Error("Signer or relayer not initialized");
            }

            setIsCreating(true);
            setError(null);

            try {
                const action = await signer.createAccount(accountId);
                if (!action) {
                    throw new Error("Failed to create account action");
                }

                await relayer.createAccount(action);

                setState({
                    accountId,
                    isCreated: true,
                });
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                setError(error);
                throw error;
            } finally {
                setIsCreating(false);
            }
        },
        [signer, relayer]
    );

    const selectAccount = useCallback((accountId: string) => {
        setState({
            accountId,
            isCreated: false,
        });
    }, []);

    return {
        ...state,
        isCreating,
        error,
        createAccount,
        selectAccount,
    };
};
