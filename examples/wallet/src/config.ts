import configJson from "./auth_config.json";
import history from "./utils/history";

const onRedirectCallback = (appState: any) => {
    history.push(appState && appState.returnTo ? appState.returnTo : window.location.pathname);
};

export function getConfig() {
    // Configure the audience here. By default, it will take whatever is in the config
    // (specified by the `audience` key) unless it's the default value of "{yourApiIdentifier}" (which
    // is what you get sometimes by using the Auth0 sample download tool from the quickstart page, if you
    // don't have an API).
    // If this resolves to `null`, the API page changes to show some helpful info about what to do
    // with the audience.
    const audience = configJson.audience && configJson.audience !== "{yourApiIdentifier}" ? configJson.audience : null;

    return {
        domain: configJson.domain,
        clientId: configJson.clientId,
        ...(audience ? { audience } : null),
    };
}

export const providerConfig = {
    domain: getConfig().domain,
    clientId: getConfig().clientId,
    onRedirectCallback,
    authorizationParams: {
        redirect_uri: window.location.origin,
        ...(getConfig().audience ? { audience: getConfig().audience } : null),
        scope: "transaction:send-transaction transaction:read-transaction test:send-test",
    },
};
