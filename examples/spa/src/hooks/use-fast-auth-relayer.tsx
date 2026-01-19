import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import FastAuthRelayer from "../services/fast-auth-relayer";
import { FastAuthClient } from "@fast-auth/browser-sdk";
import { JavascriptProvider } from "@fast-auth/javascript-provider";
import config from "../auth_config.json";
import { Connection } from "near-api-js";

interface FastAuthContextType {
    relayer: FastAuthRelayer | null;
    client: FastAuthClient<JavascriptProvider> | null;
    isRelayerInitialized: boolean;
    isClientInitialized: boolean;
    error: Error | null;
}

const FastAuthContext = createContext<FastAuthContextType | null>(null);

export function FastAuthProvider({ children }: { children: ReactNode }) {
    const [relayer, setRelayer] = useState<FastAuthRelayer | null>(null);
    const [client, setClient] = useState<FastAuthClient<JavascriptProvider> | null>(null);
    const [isRelayerInitialized, setIsRelayerInitialized] = useState(false);
    const [isClientInitialized, setIsClientInitialized] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const initializeClient = async (connection: Connection) => {
            const provider = new JavascriptProvider({
                domain: config.domain,
                clientId: config.clientId,
                audience: config.audience,
            });
            const client = new FastAuthClient(provider, connection, {
                mpcContractId: config.mpcContractId,
                fastAuthContractId: config.fastAuthContractId,
            });
            setClient(client);
            setIsClientInitialized(true);
        };
        const initializeRelayer = async () => {
            try {
                const fastAuthRelayer = new FastAuthRelayer();
                await fastAuthRelayer.init();
                setRelayer(fastAuthRelayer);
                setIsRelayerInitialized(true);
                initializeClient(fastAuthRelayer.getConnection().connection);
            } catch (err) {
                console.error("Failed to initialize FastAuthRelayer:", err);
                setError(err instanceof Error ? err : new Error(String(err)));
            }
        };

        initializeRelayer();
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
