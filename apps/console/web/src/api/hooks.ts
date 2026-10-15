import { useAuth0 } from "@auth0/auth0-react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { createAuthFetch } from "./auth-fetch";
import {
    createApiClient,
    unwrap,
    type AdminDappsQuery,
    type ExpectedVersionRequest,
    type ChangeOwnerRequest,
    type DappFormFields,
    type NearNetwork,
    type OwnerDapp,
    type ReasonRequest,
    type UpdateDappRequest,
    type UpdateSettingsRequest,
} from "./client";

const publicApi = createApiClient();

export const ME_QUERY_KEY = ["me"];
export const CONFIG_QUERY_KEY = ["config"];
const DAPP_QUERY_KEY = ["dapp"];
const ADMIN_DAPPS_QUERY_KEY = ["admin", "dapps"] as const;
const SETTINGS_QUERY_KEY = ["admin", "settings"];

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

function useDappMutation<V, R>(mutationFn: (variables: V) => Promise<R>) {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn,
        onSettled: () => queryClient.invalidateQueries({ queryKey: ADMIN_DAPPS_QUERY_KEY }),
    });
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

export function useAdminDapps(query: AdminDappsQuery) {
    const api = useApi();
    return useQuery({
        queryKey: [...ADMIN_DAPPS_QUERY_KEY, "list", query],
        queryFn: () => unwrap(api.GET("/api/console/admin/dapps", { params: { query } })),
        placeholderData: keepPreviousData,
    });
}

export function useAdminDapp(id: string) {
    const api = useApi();
    return useQuery({
        queryKey: [...ADMIN_DAPPS_QUERY_KEY, id],
        queryFn: () => unwrap(api.GET("/api/console/admin/dapps/{id}", { params: { path: { id } } })),
    });
}

export function useDappEvents(id: string) {
    const api = useApi();
    return useQuery({
        queryKey: [...ADMIN_DAPPS_QUERY_KEY, id, "events"],
        queryFn: () => unwrap(api.GET("/api/console/admin/dapps/{id}/events", { params: { path: { id } } })),
    });
}

export function useAdminEditDapp(id: string) {
    const api = useApi();
    return useDappMutation((body: UpdateDappRequest) =>
        unwrap(api.PUT("/api/console/admin/dapps/{id}", { params: { path: { id } }, body })),
    );
}

type AdminActionBodies = {
    approve: ExpectedVersionRequest;
    reject: ReasonRequest;
    "change/approve": ExpectedVersionRequest;
    "change/reject": ReasonRequest;
    owner: ChangeOwnerRequest;
    remove: ReasonRequest;
};
type AdminAction = { [A in keyof AdminActionBodies]: { action: A; body: AdminActionBodies[A] } }[keyof AdminActionBodies];

export function useAdminAction(id: string) {
    const api = useApi();
    return useDappMutation(({ action, body }: AdminAction) =>
        unwrap(api.POST(`/api/console/admin/dapps/{id}/${action}`, { params: { path: { id } }, body })),
    );
}

export function useSettings() {
    const api = useApi();
    return useQuery({ queryKey: SETTINGS_QUERY_KEY, queryFn: () => unwrap(api.GET("/api/console/admin/settings")) });
}

export function useUpdateSettings() {
    const api = useApi();
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (body: UpdateSettingsRequest) => unwrap(api.PUT("/api/console/admin/settings", { body })),
        onSuccess: (settings) => queryClient.setQueryData(SETTINGS_QUERY_KEY, settings),
    });
}
