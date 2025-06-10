import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import FastAuthRelayer from "../services/fast-auth-relayer";
import { FastAuthClient, Auth0Provider } from "@fast-auth/sdk";
import config from "../auth_config.json";

interface FastAuthContextType {
    relayer: FastAuthRelayer | null;
    client: FastAuthClient | null;
    isRelayerInitialized: boolean;
    isClientInitialized: boolean;
    error: Error | null;
}

const FastAuthContext = createContext<FastAuthContextType | null>(null);

export function FastAuthProvider({ children }: { children: ReactNode }) {
    const [relayer, setRelayer] = useState<FastAuthRelayer | null>(null);
    const [client, setClient] = useState<FastAuthClient | null>(null);
    const [isRelayerInitialized, setIsRelayerInitialized] = useState(false);
    const [isClientInitialized, setIsClientInitialized] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const initializeRelayer = async () => {
            try {
                const fastAuthRelayer = new FastAuthRelayer();
                await fastAuthRelayer.init();
                setRelayer(fastAuthRelayer);
                setIsRelayerInitialized(true);
            } catch (err) {
                console.error("Failed to initialize FastAuthRelayer:", err);
                setError(err instanceof Error ? err : new Error(String(err)));
            }
        };

        const initializeClient = async () => {
            const provider = new Auth0Provider({
                domain: config.domain,
                clientId: config.clientId,
                redirectUri: config.appOrigin,
                audience: config.audience,
            });
            const client = new FastAuthClient(provider);
            setClient(client);
            setIsClientInitialized(true);
        };

        initializeRelayer();
        initializeClient();
    }, []);

    return (
        <FastAuthContext.Provider value={{ relayer, client, isRelayerInitialized, isClientInitialized, error }}>
            {children}
        </FastAuthContext.Provider>
    );
}

export function useFastAuth(): FastAuthContextType {
    const context = useContext(FastAuthContext);
    if (context === null) {
        throw new Error("useFastAuthRelayer must be used within a FastAuthRelayerProvider");
    }
    return context;
}
