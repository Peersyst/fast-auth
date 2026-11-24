# Sandbox broker

Lets any dApp sign users in with NEAR Auth from its own domain, with no Auth0 client of its own and no permission. It is meant for hackathons, demos and PoCs. Every dApp shares one Auth0 client on the sandbox tenant, `login.testnet.fast-auth.com`, whose only callback is the broker, `sandbox.auth.near.org`.

To the dApp, the broker is an Auth0 domain: it answers the calls `auth0-spa-js` makes. The dApp keeps the tenant as the issuer of its tokens:

```ts
new Auth0Client({
    domain: "sandbox.auth.near.org",
    clientId: "<the broker's client id>",
    issuer: "https://login.testnet.fast-auth.com/",
});
```

| Endpoint | |
| --- | --- |
| `GET /authorize` | Starts the broker's own sign-in with Auth0. It passes on the dApp's `scope`, `audience`, `nonce` and signing payload, and forces the login screen when there is nothing to sign. |
| `GET /callback` | Redeems Auth0's code with the broker's own PKCE verifier and hands the dApp a one-time code of its own: by redirect, or by `postMessage` for popups. |
| `POST /oauth/token` | Redeems that code for Auth0's tokens, if the dApp's PKCE verifier matches. |
| `GET /v2/logout` | Sends the user back to `returnTo`. |

Sign-ins and codes live in memory for 10 minutes, on a single replica.

## The Auth0 client

A Single Page Application on the sandbox tenant, with no secret like every other client:

- **Token endpoint authentication:** None. The broker redeems codes with PKCE.
- **Allowed Callback URLs:** `https://sandbox.auth.near.org/callback`.
- **Name:** something like "A sandbox app". The consent screen shows this client's name for every dApp.
- **Access:** authorized on the signing API.

Its id is `AUTH0_CLIENT_ID`. Everything else is a default in `src/config`.

## Running it

Copy `.env.example` to `.env`, then run `pnpm start` and `pnpm test`. Locally the broker uses the examples' shared testnet client, which allows `http://localhost:3000/callback`.
