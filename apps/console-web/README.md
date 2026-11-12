# Console Web

React web app of the NEAR Auth Console. A dApp team signs in with Auth0, registers its dApp, follows its review and copies its credentials. An admin reviews, edits, approves, rejects and removes dApps. It talks only to the console API under `/api/console`, at `BACKEND_URL`.

## Getting Started

```bash
pnpm install
cd apps/console-web
pnpm start                # Vite on 3001, proxying /api to the console on 3000
```

Start the console first (see `apps/console/README.md`). Vite bakes the app's settings into the bundle from build variables, read from the environment or from a gitignored `apps/console-web/.env`:

```bash
AUTH0_LOGIN_DOMAIN=login.testnet.fast-auth.com
AUTH0_CLIENT_ID=<the console's Auth0 application>
NEAR_NETWORK=testnet
# BACKEND_URL=http://localhost:3000
```

Set `AUTH0_LOGIN_DOMAIN` and `AUTH0_CLIENT_ID` to sign in. `NEAR_NETWORK` is `testnet` or `mainnet` and defaults to `testnet`. Without `BACKEND_URL` the app calls `/api` on its own host, which Vite proxies to the console on 3000. With it, the app calls that console directly, which needs that console's `PUBLIC_URL` set to `http://localhost:3001`. Only these variables reach the bundle; restart Vite after changing them.

## Common Scripts

- `pnpm start` – Vite dev server
- `pnpm build` – production build into `dist/`
- `pnpm test` – component tests in jsdom
- `pnpm lint` – lint sources
- `pnpm check-types` – type-check the app and the Vite config

## Structure

- `src/modules/` holds the screens, containers and components per area: `session` (sign-in and session gates), `dapp` (the owner's dApp), `admin` (review queue and dApp detail) and `common` (layout, header, dialogs, errors).
- `src/core/` wires the dependency-injection factories, the API setup and the app state. `src/router/` holds the routes.
- `src/config/` holds the settings (docs and support links, NEAR network contracts, and the build variables above). They are fixed at build time and the app imports them directly.
- `src/design-system/`, `src/locale/` and `src/query/` set up the design system, i18next and TanStack Query providers.
- The logic lives in workspace packages: `@frontend/console-auth`, `@frontend/console-dapp` and `@frontend/console-admin` hold the controllers and query hooks per feature, on top of `@frontend/core`, `config`, `events`, `locale`, `query` and `settings`. `@frontend/design-system-react` holds the Tailwind tokens and base components. `@shared/console` is the generated API client.
- UI strings are in `packages/frontend/locale/src/resources/en/`.

## Running the Image

`docker/console-web.Dockerfile` builds on the base image and serves `dist/` from nginx on port 80. It takes the four variables above as build arguments, so the image is built per environment and needs no variables at startup. `BACKEND_URL` is the console API's origin: the console API must have this app's origin as its `PUBLIC_URL`, the one origin its CORS allows. Leave it empty when an ingress serves the API on this app's host under `/api`. `AUTH0_CLIENT_ID` is the console's Auth0 application, the one the console API takes as `AUTH0_CONSOLE_CLIENT_ID`. nginx's Content-Security-Policy allows `BACKEND_URL` and `AUTH0_LOGIN_DOMAIN`, filled in from the same build arguments. CI reads them from the repository variables `CONSOLE_WEB_BACKEND_URL`, `CONSOLE_WEB_AUTH0_LOGIN_DOMAIN`, `CONSOLE_WEB_AUTH0_CLIENT_ID` and `CONSOLE_WEB_NEAR_NETWORK`.
