import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import FastAuthRelayer from "../services/fast-auth-relayer";

interface FastAuthRelayerContextType {
    relayer: FastAuthRelayer | null;
    isInitialized: boolean;
    error: Error | null;
}

const FastAuthRelayerContext = createContext<FastAuthRelayerContextType | null>(null);

export function FastAuthRelayerProvider({ children }: { children: ReactNode }) {
    const [relayer, setRelayer] = useState<FastAuthRelayer | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        const initializeRelayer = async () => {
            try {
                const fastAuthRelayer = new FastAuthRelayer();
                await fastAuthRelayer.init();
                setRelayer(fastAuthRelayer);
                setIsInitialized(true);
            } catch (err) {
                console.error("Failed to initialize FastAuthRelayer:", err);
                setError(err instanceof Error ? err : new Error(String(err)));
            }
        };

        initializeRelayer();
    }, []);

    return <FastAuthRelayerContext.Provider value={{ relayer, isInitialized, error }}>{children}</FastAuthRelayerContext.Provider>;
}

export function useFastAuthRelayer(): FastAuthRelayerContextType {
    const context = useContext(FastAuthRelayerContext);
    if (context === null) {
        throw new Error("useFastAuthRelayer must be used within a FastAuthRelayerProvider");
    }
    return context;
}
