# NEAR Auth Console

Self-service dApp registration for NEAR Auth. A dApp team submits its app, an admin reviews it, and the console creates the team's Auth0 client and emails them the result.

`apps/console` is a NestJS API, configured only by environment variables.

## Run it locally

1. Start Postgres with `docker compose up -d`. The first start also creates `console_e2e` for the e2e tests.
2. Copy `.env.example` to `.env`, fill in `AUTH0_CONSOLE_CLIENT_ID` and your email in `ADMIN_EMAILS`, and export it with `set -a; . ./.env; set +a`.
3. Run `pnpm start`. The API migrates the database, then listens on `APP_PORT` under `/api/console`, with Swagger UI at `/api/console/docs`.

## Checks

| Command                         | What it checks                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| `pnpm lint`, `pnpm check-types` | ESLint and TypeScript                                                                       |
| `pnpm test`                     | Unit tests                                                                                  |
| `pnpm test:e2e`                 | The API against `console_e2e`. Needs Postgres. The suite loads `.env.test` itself.          |
| `pnpm spec`                     | Rewrites `openapi-spec.json`. Needs Postgres. CI fails if the committed file differs.       |
| `pnpm migration:check`          | Fails if the entities and the migrations disagree. Needs Postgres. It loads `.env.test`.    |

## Configuration

Every key is listed in `.env.example`. The app parses them once at startup and exits naming every missing or malformed key. `CONFIG_ENV=production` refuses the fake Auth0 provisioner and the fake emailer.
