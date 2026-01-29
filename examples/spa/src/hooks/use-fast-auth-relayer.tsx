import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import FastAuthRelayer from "../services/fast-auth-relayer";
import { FastAuthClient } from "@fast-auth-near/browser-sdk";
import { JavascriptProvider } from "@fast-auth-near/javascript-provider";
import { FirebaseProvider } from "@fast-auth-near/firebase-provider";
import config from "../config";
import { Connection } from "near-api-js";

export type ProviderType = "auth0" | "firebase-google" | "firebase-apple";

interface FastAuthContextType {
    relayer: FastAuthRelayer | null;
    client: FastAuthClient<JavascriptProvider | FirebaseProvider> | null;
    isRelayerInitialized: boolean;
    isClientInitialized: boolean;
    error: Error | null;
    providerType: ProviderType;
    setProviderType: (type: ProviderType) => void;
}

const FastAuthContext = createContext<FastAuthContextType | null>(null);

export function FastAuthProvider({ children }: { children: ReactNode }) {
    const [relayer, setRelayer] = useState<FastAuthRelayer | null>(null);
    const [client, setClient] = useState<FastAuthClient<JavascriptProvider | FirebaseProvider> | null>(null);
    const [isRelayerInitialized, setIsRelayerInitialized] = useState(false);
    const [isClientInitialized, setIsClientInitialized] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [providerType, setProviderType] = useState<ProviderType>("auth0");

    useEffect(() => {
        const createProvider = (type: ProviderType): JavascriptProvider | FirebaseProvider => {
            if (type === "auth0") {
                return new JavascriptProvider({
                    domain: config.auth0.domain,
                    clientId: config.auth0.clientId,
                    audience: config.auth0.audience,
                });
            }

            return new FirebaseProvider({
                apiKey: config.firebase.apiKey,
                authDomain: config.firebase.authDomain,
                projectId: config.firebase.projectId,
                storageBucket: config.firebase.storageBucket,
                messagingSenderId: config.firebase.messagingSenderId,
                appId: config.firebase.appId,
                issuerUrl: config.firebase.issuerUrl,
                customJwtIssuerUrl: config.firebase.customJwtIssuerUrl,
            });
        };

        const initializeClient = async (connection: Connection) => {
            try {
                const provider = createProvider(providerType);
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
    }, [providerType]);

    return (
        <FastAuthContext.Provider
            value={{
                relayer,
                client,
                isRelayerInitialized,
                isClientInitialized,
                providerType,
                setProviderType,
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
