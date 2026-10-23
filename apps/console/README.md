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
| `pnpm test`                     | Unit tests. CI runs `pnpm test -- --coverage`, which needs 100% coverage in `src/domain`.   |
| `pnpm test:e2e`                 | The API against `console_e2e`. Needs Postgres. The suite loads `.env.test` itself.          |
| `pnpm spec`                     | Rewrites `openapi-spec.json`. Needs Postgres. CI fails if the committed file differs.       |
| `pnpm migration:check`          | Fails if the entities differ from the migrations. Rebuilds `console_e2e`. Needs Postgres.   |

`pnpm test:e2e` and `pnpm migration:check` both drop and rebuild `console_e2e`, so run only one of them at a time against the same Postgres.

## Configuration

Every key is listed in `.env.example`. The app parses them once at startup and exits naming every missing or malformed key. `CONFIG_ENV=production` refuses the fake Auth0 provisioner and the fake emailer.

## Identity

The console identifies a person by the email in their Auth0 ID token. dApp ownership and admin rights both require Auth0's `email_verified` claim to be true. The Auth0 tenant must enable only connections that verify email addresses, because a connection that asserts `email_verified: true` for an address it never checked would grant that address's ownership and admin rights.
