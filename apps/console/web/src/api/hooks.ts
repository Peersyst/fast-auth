import { useAuth0 } from "@auth0/auth0-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { createAuthFetch } from "./auth-fetch";
import { createApiClient, unwrap, type DappFormFields, type NearNetwork, type OwnerDapp, type UpdateDappRequest } from "./client";

const publicApi = createApiClient();

export const ME_QUERY_KEY = ["me"];
export const CONFIG_QUERY_KEY = ["config"];
const DAPP_QUERY_KEY = ["dapp"];

export function useConfig() {
    return useQuery({ queryKey: CONFIG_QUERY_KEY, queryFn: () => unwrap(publicApi.GET("/api/console/config")), staleTime: Infinity });
}

export function useNearNetwork(): NearNetwork {
    const { data } = useConfig();
    if (!data) throw new Error("The config is not loaded");
    return data.nearNetwork;
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
    return useQuery({ queryKey: DAPP_QUERY_KEY, queryFn: async () => (await unwrap(api.GET("/api/console/dapp"))).dapp });
}

function useOwnerDappMutation<V>(mutationFn: (variables: V) => Promise<OwnerDapp | null>) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn,
        onSuccess: (dapp) => queryClient.setQueryData(DAPP_QUERY_KEY, dapp),
        onError: () => queryClient.invalidateQueries({ queryKey: DAPP_QUERY_KEY }),
    });
}

export function useSubmitDapp() {
    const api = useApi();
    return useOwnerDappMutation((body: DappFormFields) => unwrap(api.POST("/api/console/dapp", { body })));
}

export function useUpdateDapp(id: string) {
    const api = useApi();
    return useOwnerDappMutation((body: UpdateDappRequest) => unwrap(api.PUT("/api/console/dapp/{id}", { params: { path: { id } }, body })));
}

export function useRemoveDapp(id: string) {
    const api = useApi();
    return useOwnerDappMutation(async (expectedVersion: number) => {
        await unwrap(api.DELETE("/api/console/dapp/{id}", { params: { path: { id }, query: { expectedVersion } } }));
        return null;
    });
}
