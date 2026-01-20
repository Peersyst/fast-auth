import { useEffect, useState, useCallback } from "react";
import { useFastAuth } from "./use-fast-auth-relayer";
import { AuthState } from "./types";

export const useAuth = () => {
    const { isClientInitialized, client } = useFastAuth();

    const [state, setState] = useState<AuthState>({
        isAuthenticated: false,
        publicKey: null,
        signer: null,
        error: null,
    });

    const login = useCallback(async () => {
        if (!isClientInitialized || !client) return;

        try {
            const signer = await client.getSigner();
            if (!signer) {
                throw new Error("Failed to get signer");
            }

            const publicKey = await signer.getPublicKey();

            setState({
                isAuthenticated: true,
                publicKey: publicKey.toString(),
                signer,
                error: null,
            });
        } catch (error) {
            setState({
                isAuthenticated: false,
                publicKey: null,
                signer: null,
                error: error instanceof Error ? error : new Error(String(error)),
            });
        }
    }, [isClientInitialized, client]);

    useEffect(() => {
        login();
    }, [login]);

    return {
        ...state,
        login,
    };
};
