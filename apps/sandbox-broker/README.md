# Sandbox broker

Lets any dApp sign users in with NEAR Auth from its own domain, with no Auth0 client of its own and no permission. It is meant for hackathons, demos and PoCs. Every dApp shares one Auth0 client on the sandbox tenant (the testnet one, `login.testnet.fast-auth.com`), and the broker answers on that client's one registered origin, `sandbox.auth.near.org`.

The sandbox holds no security guarantees. Auth0 shows a notice saying so on its login and consent screens (`packages/auth0`).

## How a dApp uses it

To the dApp, the broker is an Auth0 domain. It implements the part of Auth0's API that `auth0-spa-js` calls, so a dApp points `auth0-spa-js` at the broker and keeps the tenant as the issuer of its tokens:

```ts
new Auth0Client({
    domain: "sandbox.auth.near.org",
    clientId: "<the broker's client id>",
    issuer: "https://login.testnet.fast-auth.com/",
});
```

Popup and redirect sign-ins both work.

## What it does

| Endpoint | |
| --- | --- |
| `GET /authorize` | Checks the dApp's request, ties the sign-in to the browser with a `__Host-flow-<id>` cookie, and sends the user on to Auth0. The broker uses its own PKCE and its own callback. It passes on the dApp's `scope`, `audience` and `nonce`, plus the signing payload (`transaction`, `delegateAction` or `nep413`) for the action to read. |
| `GET /callback` | Where Auth0 sends the user back. Redeems Auth0's code with the client secret, keeps the tokens under a one-time code of its own, and hands that code to the dApp: by redirect, or by `postMessage` to the popup's opener for `response_mode=web_message`. |
| `POST /oauth/token` | Redeems the broker's code for Auth0's tokens. The request has to come from the dApp's origin, with the dApp's PKCE verifier and redirect URI. CORS lets any page call it. |
| `GET /v2/logout` | Signs the user out of the tenant, then sends them back to `returnTo` through `/logout/callback`. |
| `GET /livez`, `GET /readyz` | Probes. |

The rules:

- **Any dApp, no list.** A redirect URI only has to be https, or http on `localhost` or `127.0.0.1`.
- **No silent sign-in.** `prompt=none` gets `login_required` straight away. A sign-in without a signing payload always shows the login screen, so no site learns who the user is without them doing anything. A signing request ends on the consent form, which is the user's own action, so it may reuse the Auth0 session.
- **Never a production tenant.** The service refuses to start if `AUTH0_DOMAIN` is one. The on-chain guard does not check which client a token came from, so any client of a tenant can sign for that tenant's accounts.
- **Nothing sensitive in the logs.** The access log has the path only, since query strings and bodies carry codes, tokens and payloads.
- **Memory only.** Sign-ins and codes live in memory and expire: 10 minutes for a sign-in, 1 minute for a code. The broker runs as one replica, and a restart only loses the sign-ins in progress. `MAX_PENDING` caps each store, so abandoned sign-ins cannot fill the memory.

## The Auth0 client

On the sandbox tenant, create a **Regular Web Application** with:

- **Grant types:** only Authorization Code.
- **Allowed Callback URLs:** `https://sandbox.auth.near.org/callback`.
- **Allowed Logout URLs:** `https://sandbox.auth.near.org/logout/callback`.
- **Allowed Web Origins:** none, since the broker redeems codes from its server.
- **Name and logo:** the consent screen shows this client's name for every dApp, so name it for what it is, such as "A sandbox app", and give it no logo.
- **Access:** authorize the client on the signing API, like the tenant's other clients.

Its id and secret are `AUTH0_CLIENT_ID` and `AUTH0_CLIENT_SECRET`.

## Running it

Copy `.env.example` to `.env`, fill in the client, and run `pnpm start`. To sign in locally, the client also needs `http://localhost:3000/callback` and `http://localhost:3000/logout/callback`. Browsers accept the broker's `Secure` cookies on `http://localhost`.

`pnpm test` runs the unit tests and an end-to-end test of the whole flow over HTTP, with Auth0's token endpoint faked.
