# NEAR Auth for NEAR Connect

Social login for NEAR, backed by [fast-auth](https://auth.near.org). The user signs in with Google, Apple,
email or a passkey, and the NEAR MPC network derives the key that signs for them from that identity, so
there is no seed phrase and no key material in this executor.

This app builds the executor script that NEAR Connect runs in its sandboxed iframe. NEAR Connect only lists the
wallet, through a manifest entry `near-auth` whose `executor` points at wherever this script is served.

This folder stays outside the pnpm workspace with its own lockfile, so the script every dapp loads never changes
with the rest of the repo's dependencies. Build it from this folder:

```sh
pnpm install --frozen-lockfile --ignore-workspace
pnpm check-types
pnpm build
```

## What a dapp needs

A dapp's origin must be an allowed callback URL and an allowed web origin of its Auth0 application on each network it
uses, because Auth0 posts the authorization response back to that origin.

A dapp in `dapps` of `dapps.json` uses its own application on the networks its entry lists and is refused on the
others; any other dapp uses `default`, Peersyst's. Its own application lets Peersyst track that dapp's users separately
in Auth0. Refused sign-ins and signatures fail with `NEAR Auth is not available for <origin> on <network>`.
`dapps.json` only routes. The allowed URLs above are the gate. `build` validates it first
(`scripts/validate-dapps.mjs`): exact https origins as keys, known networks, and an application of the dapp's own.

A listed application must be on NEAR Auth's tenant with the same login connections, so users keep their account.

Every dapp relays through the network's `relayerBaseUrl` in `src/near-auth/config.ts`, which pays for every dapp's
signatures. That relayer, including a local one for `build:local`, must serve `POST /relayer/fast-auth/sign-tx` and
allow CORS for `Origin: null` (the wallet's sandbox). For each network it serves, it needs these values, where
`auth0Domain` and `fastAuthContractId` come from `src/near-auth/config.ts`:

| `apps/relayer` variable      | Value                        |
| ---------------------------- | ---------------------------- |
| `NEAR_GUARD_ID`              | `jwt#https://<auth0Domain>/` |
| `NEAR_ISSUER`                | `https://<auth0Domain>/`     |
| `NEAR_FAST_AUTH_CONTRACT_ID` | `<fastAuthContractId>`       |

The shared relayer accepts every dapp's application because the on-chain guard accepts tokens from any application on
the tenant, and `apps/relayer` does not check `azp`.

Transactions and messages are limited to 1,024 bytes once borsh-encoded, so large ones, such as a contract
deployment, cannot be signed.

## Message signing

`signMessage` and `signInAndSignMessage` need NEP-413 support in the Auth0 signing action (its `nep413` authorize
parameter) and the NEP-413 consent form on the tenant. Without them the tenant rejects the request, so the manifest
entry can declare both features `true` only once the tenant has them.

## Build variants

`src/near-auth-local/` and `src/near-auth-demo/` hold only the modules they replace. `vite.config.ts` serves this
wallet's own `./x` imports from the variant folder when it has an `x.ts`, and each override re-exports the rest of the
real module. Neither build is published.

| Script        | Output                                      | Overrides                                                                                                                                                                         |
| ------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build`       | `dist/production/connector/near-connect.js` | The published wallet.                                                                                                                                                             |
| `build:local` | `dist/local/connector/near-connect.js`      | `config.ts`: testnet relays through `http://localhost:3001/api`; mainnet is unchanged.                                                                                            |
| `build:demo`  | `dist/demo/connector/near-connect.js`       | `auth0.ts`, `relayer.ts`, `near.ts`: testnet only. Signs in as a fixed identity and simulates Auth0, the relayer and the broadcast; read-only RPC and indexer calls still happen. |

The demo signs in to the testnet account `near-auth-demo.testnet`, which holds the key its fixed identity derives. If
that key is removed, the demo falls back to an implicit account that does not exist.

## Serving

`serve`, `serve:local` and `serve:demo` serve the matching build at `http://localhost:8080/connector/near-connect.js`
with `Access-Control-Allow-Origin: *`. NEAR Connect downloads the script from the dapp's page, so wherever it is served
it must be readable from any origin.

NEAR Connect runs the copy it cached for the manifest entry's `id` and `version` and refreshes it in the background
once per page load, so after a rebuild, a variant switch or an upload, the first wallet call on a newly loaded page
still runs the previous build.
