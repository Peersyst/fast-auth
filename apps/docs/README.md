# NEAR Auth Docs

Developer documentation for **NEAR Auth**, built with [Mintlify](https://mintlify.com).

The site mirrors the look & feel of [docs.near.org](https://docs.near.org): the `mint`
theme, NEAR green (`#1fb858`) as the primary color, and the Inter typeface.

## Structure

The navigation is defined in [`docs.json`](./docs.json) and is split into four tabs:

| Tab | Purpose |
| --- | --- |
| **Home** | Introduction, quickstarts, integration guides, and how to apply for production access. |
| **Protocol** | Deep dives into the contracts, JWTs, MPC, the Auth0 flow, and advanced topics (custom issuer, attestation). |
| **SDKs** | Reference-style documentation for every published library and provider. |
| **Resources** | Deployed contract addresses, service endpoints, and network configuration. |

## Local development

This app is part of the monorepo and wires into the standard Turborepo tasks. From the repo
root:

```bash
pnpm --filter near-auth-docs dev     # start the Mintlify dev server (http://localhost:3000)
pnpm --filter near-auth-docs lint    # validate content & check for broken links
pnpm --filter near-auth-docs clean    # remove .turbo, .mint and node_modules
```

Or from this directory:

```bash
pnpm dev      # mint dev
pnpm lint     # mint broken-links
```

These also run as part of the workspace-wide `pnpm dev` / `pnpm lint` (via `turbo run …`).
The Mintlify CLI is invoked through `npx`, so no global install is required.
