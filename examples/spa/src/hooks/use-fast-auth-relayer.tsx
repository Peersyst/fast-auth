import {createContext, useContext, useState, useEffect, type ReactNode} from "react";
import FastAuthRelayer from "../services/fast-auth-relayer";
import {FastAuthClient} from "@fast-auth/browser-sdk";
import {JavascriptProvider} from "@fast-auth/javascript-provider";
import {FirebaseProvider} from "@fast-auth/firebase-provider";
import config from "../auth_config.json";
import {Connection} from "near-api-js";

export type ProviderType = "auth0" | "firebase-google" | "firebase-apple";

interface FastAuthContextType {
    relayer: FastAuthRelayer | null;
    client: FastAuthClient<JavascriptProvider | FirebaseProvider> | null;
    isRelayerInitialized: boolean;
    isClientInitialized: boolean;
    error: Error | null;
    providerType: ProviderType | null;
    setProviderType: (type: ProviderType) => void;
}

const FastAuthContext = createContext<FastAuthContextType | null>(null);

export function FastAuthProvider({children}: { children: ReactNode }) {
    const [relayer, setRelayer] = useState<FastAuthRelayer | null>(null);
    const [client, setClient] = useState<FastAuthClient<JavascriptProvider | FirebaseProvider> | null>(null);
    const [isRelayerInitialized, setIsRelayerInitialized] = useState(false);
    const [isClientInitialized, setIsClientInitialized] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [providerType, setProviderType] = useState<ProviderType>("auth0");

    useEffect(() => {
        const initializeClient = async (connection: Connection) => {
            try {
                let provider: JavascriptProvider | FirebaseProvider;

                if (providerType === "auth0") {
                    provider = new JavascriptProvider({
                        domain: config.domain,
                        clientId: config.clientId,

                        audience: config.audience,
                    });
                } else {
                    provider = new FirebaseProvider({
                        apiKey: config.firebase.apiKey,
                        authDomain: config.firebase.authDomain,
                        projectId: config.firebase.projectId,
                        storageBucket: config.firebase.storageBucket,
                        messagingSenderId: config.firebase.messagingSenderId,
                        appId: config.firebase.appId,
                        issuerUrl: config.firebase.issuerUrl,
                        customJwtIssuerUrl: config.firebase.customJwtIssuerUrl,
                    });
                }

                const client = new FastAuthClient(provider, connection, {
                    mpcContractId: config.mpcContractId,
                    fastAuthContractId: config.fastAuthContractId,
                });
                setClient(client);
                setIsClientInitialized(true);
            } catch (err) {
                console.error("Failed to initialize FastAuthClient:", err);
                setError(err instanceof Error ? err : new Error(String(err)));
            }
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
    }, [providerType]);

    return (
        <FastAuthContext.Provider value={{relayer, client, isRelayerInitialized, isClientInitialized, providerType, setProviderType, error}}>
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
