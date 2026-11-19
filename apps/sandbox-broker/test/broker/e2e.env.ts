// The configuration is read as the app module loads, so the e2e test imports this before it.
export const BROKER = "https://sandbox.example";

Object.assign(process.env, {
    PUBLIC_URL: BROKER,
    AUTH0_DOMAIN: "login.sandbox.example",
    AUTH0_CLIENT_ID: "broker-client",
    AUTH0_CLIENT_SECRET: "broker-secret",
});
