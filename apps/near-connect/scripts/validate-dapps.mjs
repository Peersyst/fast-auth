import { readFileSync } from "node:fs";

const NETWORKS = ["mainnet", "testnet"];
const routing = JSON.parse(readFileSync(new URL("../dapps.json", import.meta.url), "utf8"));
const errors = [];

const isObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isHttpsUrl = (value) => typeof value === "string" && URL.canParse(value) && new URL(value).protocol === "https:";

const checkNetworks = (where, networks) => {
    for (const [network, dapp] of Object.entries(networks)) {
        if (!NETWORKS.includes(network)) errors.push(`${where}: unknown network "${network}"`);
        if (!isObject(dapp) || Object.keys(dapp).some((key) => key !== "auth0ClientId")) {
            errors.push(`${where}.${network}: must be { "auth0ClientId" }`);
            continue;
        }
        if (typeof dapp.auth0ClientId !== "string" || !dapp.auth0ClientId) errors.push(`${where}.${network}: auth0ClientId is missing`);
    }
};

if (!isObject(routing) || !isObject(routing.default) || !isObject(routing.dapps) || Object.keys(routing).length !== 2) {
    errors.push('the file must be { "default": { ... }, "dapps": { ... } }');
} else {
    checkNetworks("default", routing.default);
    for (const [origin, networks] of Object.entries(routing.dapps)) {
        const where = `dapps["${origin}"]`;
        if (!isHttpsUrl(origin) || new URL(origin).origin !== origin) {
            errors.push(`${where}: key must be an exact https origin, e.g. https://app.example.com`);
        }
        if (!isObject(networks) || Object.keys(networks).length === 0) {
            errors.push(`${where}: lists no network`);
            continue;
        }
        checkNetworks(where, networks);
        for (const [network, dapp] of Object.entries(networks)) {
            if (NETWORKS.includes(network) && dapp?.auth0ClientId && dapp.auth0ClientId === routing.default[network]?.auth0ClientId) {
                errors.push(`${where}.${network}: uses the default auth0ClientId; a listed dapp needs its own application`);
            }
        }
    }
}

if (errors.length > 0) {
    console.error(`dapps.json is invalid:\n- ${errors.join("\n- ")}`);
    process.exit(1);
}
