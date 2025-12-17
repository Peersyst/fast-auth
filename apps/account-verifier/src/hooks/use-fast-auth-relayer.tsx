import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import FastAuthRelayer, { type NetworkId } from "../services/fast-auth-relayer";
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
    network: NetworkId;
    setNetwork: (network: NetworkId) => Promise<void>;
}

const FastAuthContext = createContext<FastAuthContextType | null>(null);

const APP_ORIGIN = import.meta.env.VITE_APP_ORIGIN || config.appOrigin;
const NETWORK_STORAGE_KEY = "fast-auth-network";

const getStoredNetwork = (): NetworkId => {
    if (typeof window === "undefined") return "testnet";
    const stored = localStorage.getItem(NETWORK_STORAGE_KEY);
    if (stored === "mainnet" || stored === "testnet") {
        return stored;
    }
    return "testnet";
};

const saveNetwork = (network: NetworkId) => {
    if (typeof window !== "undefined") {
        localStorage.setItem(NETWORK_STORAGE_KEY, network);
    }
};

const getContractsFromNetwork = (network: NetworkId) => {
    switch (network) {
        case "mainnet":
            return {
                mpcContractId: "v1.signer",
                fastAuthContractId: "fast-auth.near",
            };
        case "testnet":
            return {
                mpcContractId: "v1.signer-prod.testnet",
                fastAuthContractId: "fast-auth-beta-001.testnet",
            };
    }
};

export function FastAuthProvider({ children, initialNetwork }: { children: ReactNode; initialNetwork?: NetworkId }) {
    // Load network from localStorage or use initialNetwork/default
    const storedNetwork = getStoredNetwork();
    const defaultNetwork = initialNetwork || storedNetwork;
    
    const [relayer, setRelayer] = useState<FastAuthRelayer | null>(null);
    const [client, setClient] = useState<FastAuthClient<JavascriptProvider> | null>(null);
    const [isRelayerInitialized, setIsRelayerInitialized] = useState(false);
    const [isClientInitialized, setIsClientInitialized] = useState(false);
    const [error, setError] = useState<Error | null>(null);
    const [network, setNetworkState] = useState<NetworkId>(defaultNetwork);

    const initializeClient = async (connection: Connection, networkId: NetworkId) => {
        const provider = new JavascriptProvider({
            domain: config.domain,
            clientId: config.clientId,
            redirectUri: APP_ORIGIN,
            audience: config.audience,
        });
        const contracts = getContractsFromNetwork(networkId);
        const client = new FastAuthClient(provider, connection, {
            mpcContractId: contracts.mpcContractId,
            fastAuthContractId: contracts.fastAuthContractId,
        });
        setClient(client);
        setIsClientInitialized(true);
    };

    const initializeRelayer = async (networkId: NetworkId) => {
        try {
            const fastAuthRelayer = new FastAuthRelayer(networkId);
            await fastAuthRelayer.init();
            setRelayer(fastAuthRelayer);
            setIsRelayerInitialized(true);
            await initializeClient(fastAuthRelayer.getConnection().connection, networkId);
            setError(null);
        } catch (err) {
            console.error("Failed to initialize FastAuthRelayer:", err);
            setError(err instanceof Error ? err : new Error(String(err)));
        }
    };

    useEffect(() => {
        // Save the initial network to localStorage if not already saved
        saveNetwork(network);
        initializeRelayer(network);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const setNetwork = async (newNetwork: NetworkId) => {
        if (newNetwork === network) return;
        
        // Save to localStorage
        saveNetwork(newNetwork);
        
        setNetworkState(newNetwork);
        setIsRelayerInitialized(false);
        setIsClientInitialized(false);
        setClient(null);
        
        try {
            if (relayer) {
                await relayer.switchNetwork(newNetwork);
                setRelayer(relayer);
                setIsRelayerInitialized(true);
                await initializeClient(relayer.getConnection().connection, newNetwork);
            } else {
                await initializeRelayer(newNetwork);
            }
        } catch (err) {
            console.error("Failed to switch network:", err);
            setError(err instanceof Error ? err : new Error(String(err)));
        }
    };

    return (
        <FastAuthContext.Provider value={{ relayer, client, isRelayerInitialized, isClientInitialized, error, network, setNetwork }}>
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
