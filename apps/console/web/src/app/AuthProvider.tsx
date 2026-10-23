import { Auth0Provider } from "@auth0/auth0-react";
import type { ReactNode } from "react";
import { useConfig } from "../api/hooks";
import { LoadError } from "./LoadError";
import { LoadingScreen } from "./LoadingScreen";
import { router } from "./router";

export function AuthProvider({ children }: { children: ReactNode }) {
    const config = useConfig();

    if (config.data) {
        return (
            <Auth0Provider
                domain={config.data.auth0Domain}
                clientId={config.data.auth0ClientId}
                authorizationParams={{ redirect_uri: window.location.origin }}
                cacheLocation="memory"
                useRefreshTokens
                useRefreshTokensFallback
                onRedirectCallback={(appState) => void router.navigate(appState?.returnTo ?? "/", { replace: true })}
            >
                {children}
            </Auth0Provider>
        );
    }
    if (config.isError) {
        return (
            <LoadError
                title="The console could not start"
                error={config.error}
                onRetry={() => void config.refetch()}
                retrying={config.isFetching}
            />
        );
    }
    return <LoadingScreen />;
}
