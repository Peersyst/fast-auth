import { useAuth0 } from "@auth0/auth0-react";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { createAuthFetch } from "./auth-fetch";
import { createApiClient, unwrap } from "./client";

const publicApi = createApiClient();

export const ME_QUERY_KEY = ["me"];
export const CONFIG_QUERY_KEY = ["config"];

export function useConfig() {
    return useQuery({ queryKey: CONFIG_QUERY_KEY, queryFn: () => unwrap(publicApi.GET("/api/console/config")), staleTime: Infinity });
}

function useApi() {
    const { getIdTokenClaims, getAccessTokenSilently } = useAuth0();
    return useMemo(
        () => createApiClient(createAuthFetch({ getIdTokenClaims, getAccessTokenSilently })),
        [getIdTokenClaims, getAccessTokenSilently],
    );
}

export function useMe(enabled: boolean) {
    const api = useApi();
    return useQuery({ queryKey: ME_QUERY_KEY, queryFn: () => unwrap(api.GET("/api/console/me")), enabled });
}

export function useMyDapp() {
    const api = useApi();
    return useQuery({ queryKey: ["dapp"], queryFn: async () => (await unwrap(api.GET("/api/console/dapp"))).dapp });
}
