# Console Web

React web app of the NEAR Auth Console. A dApp team signs in with Auth0, registers its dApp, follows its review and copies its credentials. An admin reviews, edits, approves, rejects and removes dApps and switches auto-approval. It talks only to the console API under `/api/console`, at `BACKEND_URL`.

## Getting Started

```bash
pnpm install
cd apps/console-web
pnpm start                # Vite on 3001, proxying /api to the console on 3000
```

Start the console first (see `apps/console/README.md`). Without `BACKEND_URL` the app calls `/api` on its own host, which Vite proxies to the console on 3000. With it, the app calls that console directly, which needs that console's `PUBLIC_URL` set to `http://localhost:3001`. The app reads its Auth0 domain, client id and NEAR network from `/config.json` on its own host. Fill them in `public/config.json` to sign in during development; the image replaces it at startup, as it does `public/env.js`, which is empty in development.

## Common Scripts

- `pnpm start` – Vite dev server
- `pnpm build` – production build into `dist/`
- `pnpm test` – component tests in jsdom
- `pnpm lint` – lint sources
- `pnpm check-types` – type-check the app and the Vite config

## Structure

- `src/modules/` holds the screens, containers and components per area: `session` (sign-in and session gates), `dapp` (the owner's dApp), `admin` (review queue and dApp detail) and `common` (layout, header, dialogs, errors).
- `src/core/` wires the dependency-injection factories, the API setup and the app state. `src/router/` holds the routes.
- `src/config/` holds the built-in settings (docs and support links, NEAR network contracts) and fetches the rest from `/config.json`, falling back to the last cached copy.
- `src/design-system/`, `src/locale/` and `src/query/` set up the design system, i18next and TanStack Query providers.
- The logic lives in workspace packages: `@frontend/console-auth`, `@frontend/console-dapp` and `@frontend/console-admin` hold the controllers and query hooks per feature, on top of `@frontend/core`, `config`, `events`, `locale`, `query` and `settings`. `@frontend/design-system-react` holds the Tailwind tokens and base components. `@shared/console` is the generated API client.
- UI strings are in `packages/frontend/locale/src/resources/en/`.

## Running the Image

`docker/console-web.Dockerfile` builds on the base image and serves `dist/` from nginx on port 80. It takes four variables at startup, so the same image runs in every environment. `BACKEND_URL` is the console API's origin: nginx serves it to the app in `/env.js` and allows it in the Content-Security-Policy, and the console API must have this app's origin as its `PUBLIC_URL`, the one origin its CORS allows. Set it empty when an ingress serves the API on this app's host under `/api`. `AUTH0_LOGIN_DOMAIN` is the tenant users sign in on, served in `/config.json` and allowed in the Content-Security-Policy. `AUTH0_CLIENT_ID` is the console's Auth0 application, the one the console API takes as `AUTH0_CONSOLE_CLIENT_ID`, and `NEAR_NETWORK` is `testnet` or `mainnet`, the network whose credentials the app shows; nginx serves both in `/config.json`. nginx refuses to start without any of them.
