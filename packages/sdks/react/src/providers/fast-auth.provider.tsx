import React, { createContext, PropsWithChildren, ReactNode, useEffect, useState } from "react";
import { FastAuthClient, IFastAuthProvider } from "../core";
import { Connection } from "near-api-js";

export interface IFastAuthContext {
    client: FastAuthClient | null;
}

export type FastAuthContracts = {
    mpc: string;
    fastAuth: string;
};

export type AuthProvider = {
    reactProvider?: (children: ReactNode) => ReactNode
    provider: IFastAuthProvider
}

export type FastAuthProviderProps = PropsWithChildren<{
    provider: AuthProvider;
    connection: Connection;
    contracts: FastAuthContracts;
}>;

export const FastAuthContext = createContext<IFastAuthContext | null>(null);

export function FastAuthProvider({ children, provider: providerProp, connection, contracts }: FastAuthProviderProps) {
    const { reactProvider = (children) => children, provider } = providerProp

    const [client, setClient] = useState<FastAuthClient | null>(null);

    useEffect(() => {
        const client = new FastAuthClient(provider, connection, {
            mpcContractId: contracts.mpc,
            fastAuthContractId: contracts.fastAuth,  
        });
        setClient(client);
    }, [providerProp, connection, contracts]);

    return (
        <FastAuthContext.Provider value={{ client }}>
            {reactProvider(children)}
        </FastAuthContext.Provider>
    );
}