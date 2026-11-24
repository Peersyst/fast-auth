import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import FastAuthRelayer from "../services/fast-auth-relayer";
import { FastAuthClient } from "@fast-auth-near/browser-sdk";
import { JavascriptProvider } from "@fast-auth-near/javascript-provider";
import config from "../config";
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
            try {
                const provider = new JavascriptProvider({
                    network: config.auth0.network,
                    clientId: config.auth0.clientId,
                    domain: config.auth0.domain,
                    issuer: config.auth0.issuer,
                });
                const newClient = new FastAuthClient(provider, connection, {
                    mpcContractId: config.near.mpcContractId,
                    fastAuthContractId: config.near.fastAuthContractId,
                });

                setClient(newClient);
                setIsClientInitialized(true);
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                console.error("Failed to initialize FastAuthClient:", error);
                setError(error);
            }
        };

        const initializeRelayer = async () => {
            try {
                const newRelayer = new FastAuthRelayer();
                await newRelayer.init();

                setRelayer(newRelayer);
                setIsRelayerInitialized(true);

                await initializeClient(newRelayer.getConnection().connection);
            } catch (err) {
                const error = err instanceof Error ? err : new Error(String(err));
                console.error("Failed to initialize FastAuthRelayer:", error);
                setError(error);
            }
        };

        initializeRelayer();
    }, []);

    return (
        <FastAuthContext.Provider
            value={{
                relayer,
                client,
                isRelayerInitialized,
                isClientInitialized,
                error,
            }}
        >
            {children}
        </FastAuthContext.Provider>
    );
}

export function useFastAuth(): FastAuthContextType {
    const context = useContext(FastAuthContext);
    if (context === null) {
        throw new Error("useFastAuth must be used within a FastAuthProvider");
    }
    return context;
}
