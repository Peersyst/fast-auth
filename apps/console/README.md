# Console

NestJS service for the NEAR Auth Console. A dApp team submits its app. An admin approves or rejects it, unless auto-approval approved it. The console creates the team's Auth0 client on approval. It is configured only by environment variables and serves its routes under `/api/console`.

## Getting Started

```bash
pnpm install
docker run -d --name console-db -p 5432:5432 -e POSTGRES_DB=db_database -e POSTGRES_USER=db_user -e POSTGRES_PASSWORD=db_password postgres:16
cp .env.example .env         # fill in AUTH0_CONSOLE_CLIENT_ID and your email in ADMIN_EMAILS
set -a; . ./.env; set +a
pnpm start
```

On start the console runs the pending migrations of `@database/console` through TypeORM's `migrationsRun`. It writes `openapi-spec.json` as a single JSON line and, outside production, serves Swagger UI at `/swagger`, outside the `/api/console` prefix.

## Common Scripts

- `pnpm build` – compile the project
- `pnpm test` – run unit tests
- `pnpm test:integration` – run integration tests against the Postgres above
- `pnpm lint` – lint sources
- `pnpm check-types` – type-check without emitting

To run the compiled app or a command from a checkout, run `pnpm bundle` from the repository root first, which points the workspace packages at their compiled output, as the base image does, and `pnpm genesys unbundle` afterwards.

## API Client

`@shared/console` is the TypeScript client of this API, generated from `openapi-spec.json`, which the console writes on start. After changing an endpoint or a DTO, start the console once so it rewrites the spec, then regenerate the client and check its consumers:

```bash
cd packages/shared/console && pnpm generate
npx turbo run build --filter=@shared/console
npx turbo run check-types --filter=...@shared/console
```

## Environment Variables

Every variable is in `.env.example`. The app reads them once at startup and exits naming the first missing or malformed setting.

| Variable                                                                                                 | Description                                                                               | Default/Notes                                               |
| -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `CONFIG_ENV`                                                                                             | `development`, `test`, `preview`, `staging` or `production`                               | `development`                                               |
| `APP_PORT`                                                                                               | HTTP port, which also serves the metrics                                                  | `3000`, `3001` in development                               |
| `PUBLIC_URL`                                                                                             | The web app's origin, which CORS allows and Slack links point to; no trailing /           | Required                                                    |
| `READYZ_TIMEOUT_MS`                                                                                      | Readiness database timeout                                                                | `2000`                                                      |
| `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_DATABASE`                                            | Postgres connection                                                                       | `db` (dev: `localhost`), `5432`, `db_user`, ...             |
| `DB_POOL_SIZE`, `DB_SSL`, `DB_CONNECT_TIMEOUT_MS`, `DB_LOCK_TIMEOUT_MS`                                  | Pool size (at least 2), TLS, connect timeout, session `lock_timeout`                      | `10`, `false`, `5000`, `10000`                              |
| `AUTH0_LOGIN_DOMAIN`, `AUTH0_CONSOLE_CLIENT_ID`                                                          | The tenant users sign in on, and the console's own client                                 | Required                                                    |
| `AUTH0_PROVISIONER`                                                                                      | `management` or `fake`; production refuses `fake`                                         | Required                                                    |
| `AUTH0_MGMT_DOMAIN`, `AUTH0_M2M_CLIENT_ID`, `AUTH0_M2M_CLIENT_SECRET`, `AUTH0_TEMPLATE_CLIENT_ID`        | Management API credentials and the client new clients copy                                | Required for `management`                                   |
| `AUTH0_MGMT_RETRY_AFTER_MS`, `AUTH0_MGMT_MAX_RETRY_AFTER_MS`, `AUTH0_MGMT_TIMEOUT_MS`                    | Retry wait, Retry-After cap, per-request deadline                                         | `1000`, `10000`, `10000`                                    |
| `ADMIN_EMAILS`                                                                                           | Comma-separated admins, lowercased; an admin also needs a verified email                  | Required                                                    |
| `AUTO_APPROVAL_ENABLED`                                                                                  | Approves new dApps without review. Read at startup, so restart after a change             | `false`                                                     |
| `SLACK_WEBHOOK_URL`, `SLACK_TIMEOUT_MS`                                                                  | Slack incoming webhook (`https://hooks.slack.com/...`) for admin alerts, and its deadline | none (Slack off), `5000`                                    |

The config namespaces live in `src/config/*.config.ts`. The Management API settings are `auth0.management`, `null` when the adapter is `fake`. The generic validators come from `@backend/config`.

## Identity

The console identifies a person by the email in their Auth0 ID token. dApp ownership and admin rights both require Auth0's `email_verified` claim to be true, so the tenant must enable only connections that verify email addresses.

## HTTP API

Every route is under `/api/console`. CORS allows only `PUBLIC_URL`, the web app's origin, which calls the API from its own host. `express-openapi-validator` checks each request against `openapi-spec.json`, and a global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted` and `transform` checks each body and query against its request class.

### Errors

A business error answers `{ statusCode, message }`, where `message` is one of the codes below. The codes are in each module's `error/` folder, merged in `src/modules/common/exception/error-codes.ts`. `ErrorFilter` from `@backend/core` answers an OpenAPI validator refusal with its status and message. Any other error, such as a `ValidationPipe` refusal or an unexpected failure, gets Nest's default answer.

| Code                  | Status | When                                                                                           |
| --------------------- | ------ | ---------------------------------------------------------------------------------------------- |
| `UNAUTHENTICATED`     | 401    | No token, another scheme than `Bearer`, or a token that fails verification or the claim checks |
| `EMAIL_REQUIRED`      | 403    | The token has no email claim                                                                   |
| `EMAIL_NOT_VERIFIED`  | 403    | The route needs a verified email and `email_verified` is not true                              |
| `FORBIDDEN_ROLE`      | 403    | An admin route and a caller who is not an admin                                                |
| `DAPP_NOT_FOUND`      | 404    | No dApp with that id, or one the caller neither owns nor may read as an admin                  |
| `DAPP_ALREADY_EXISTS` | 409    | The email already owns a live dApp, including a race on the live-owner unique index            |
| `INVALID_TRANSITION`  | 409    | The dApp's status does not allow the review                                                    |
| `DAPP_CHANGED`        | 409    | Another request held the dApp's row past the lock timeout (`55P03`)                            |

### Authentication

A request signs in with `Authorization: Bearer <Auth0 ID token>`; extra whitespace after `Bearer` is accepted. `Auth0JwtGuard` (`src/modules/auth/guard/auth0-jwt.guard.ts`) verifies the token with jose's `jwtVerify`:

- RS256, issuer `https://<AUTH0_LOGIN_DOMAIN>/`, and audience `AUTH0_CONSOLE_CLIENT_ID`.
- An email claim is required. The caller is an admin when `email_verified` is true and the lowercased email is in `ADMIN_EMAILS`, and a user otherwise.

The key comes from `src/modules/auth/jwt-key-set.ts`, a jose remote key set for `https://<AUTH0_LOGIN_DOMAIN>/.well-known/jwks.json` behind the `JWT_KEY_SET` token. A token the key set cannot resolve, a JWKS outage included, answers 401.

Routes are guarded per controller with one of three decorators from `src/modules/auth/decorator/authenticated.decorator.ts`:

- `SignedIn()` needs a valid token.
- `Authenticated()` also needs a verified email.
- `AdminAuthenticated()` also needs an admin. The verified email is checked before the role.

### Public and session routes

| Route          | Guard      | Answer                                                                                                                     |
| -------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| `GET /me`      | `SignedIn` | 200 `{ email, role, emailVerified }`, `role` is `user` or `admin`                                                          |
| `GET /livez`   | none       | 200 `{ status: "ok" }`                                                                                                     |
| `GET /readyz`  | none       | 200 `{ status: "ok", checks: { database } }`, or 503 with `status: "error"` and a `message` on the failed check           |
| `GET /metrics` | none       | Prometheus text, from `PrometheusModule` on `APP_PORT`                                                                     |

`/readyz` fails the `database` check when the database does not answer a ping within `READYZ_TIMEOUT_MS`.

### dApp routes

The review routes, `POST /dapp/:id/approve` and `/reject`, are under `AdminAuthenticated()`, and the others under `Authenticated()`. An admin is a caller with the `admin` role.

| Route                    | Answer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /dapp`              | 200 `{ items, totalItems, currentPage, pages }`, the `Paginated` shape of `@backend/core/pagination`, holding `Dapp` items. An admin gets one page of every dApp that matches the query: `needsReview` (pending), `status`, `search`, `page` (1 to 10000, default 1), `pageSize` (1 to 100, default 20), `orderBy` (`createdAt`, `updatedAt`, `name` or `status`) and `order` (`ASC`, the default, or `DESC`). `search` matches a case-insensitive substring of the name, owner email, contact email or client id, with LIKE wildcards taken literally. Without `orderBy`, the list sorts by creation time. The id breaks ties. Anyone else gets their own live (not removed) dApp, matched by email case-insensitively, as a list of 0 or 1 item. The query is validated but ignored for them. |
| `GET /dapp/:id`          | 200 `Dapp`. An admin can read any dApp, anyone else only their own. 404 `DAPP_NOT_FOUND` otherwise.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `POST /dapp`             | Body `CreateDappRequest`. 201 `Dapp` with status `pending`, or `approved` with an Auth0 client when auto-approval approved it. 409 `DAPP_ALREADY_EXISTS` when the email already owns a live dApp.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `POST /dapp/:id/approve` | Creates the pending dApp's Auth0 client and approves it. 200 `Dapp`, or 200 `Dapp` still `pending` with `auth0Error` when the Auth0 call fails. 409 `INVALID_TRANSITION` for a dApp that is not pending.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `POST /dapp/:id/reject`  | Rejects a pending dApp. 200 `Dapp`. 409 `INVALID_TRANSITION` for a dApp that is not pending.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

`Dapp` is `{ id, ownerEmail, name, description, logoUrl, mauBracket, callbackUrls, logoutUrls, webOrigins, contactEmail, status, auth0ClientId, auth0Error, reviewedAt, createdAt }`. `auth0Error` holds the error of the last failed Auth0 call and is `null` once an Auth0 write succeeds. `reviewedAt` is when an admin approved or rejected the dApp, or auto-approval approved it, and `null` while it is pending. Dates are ISO strings.

`CreateDappRequest` fields follow the rules in `@shared/modules/dapp`:

- `name` is trimmed, 1 to 64 UTF-16 units, with no `<`, `>` or control characters.
- `description` is trimmed, at most 140 units, with no control characters but tab and line breaks.
- `logoUrl` is a public `https:` URL of at most 255 characters.
- `mauBracket` is one of `lt1k`, `1k_10k`, `10k_25k` and `gt25k`.
- `callbackUrls` holds 1 to 10 URLs, `logoutUrls` 0 to 10, and `webOrigins` 1 to 10. Each entry is trimmed, its scheme and authority lowercased, and the list de-duplicated. Each must be an `https:` URL on a DNS name with a top-level domain: no IP address, no single-label host, no credentials, no fragment on a URL, and nothing after the port on an origin.
- `contactEmail` is a plain address with a dotted domain, at most 254 characters.
- No text may contain NUL. The admin `search` is at most 100 characters.

## dApp writes

`src/modules/dapp/dapp.service.ts` runs each write in one transaction. A review locks the dApp row `FOR UPDATE` and checks the status after the lock, so two reviews of one dApp run one after the other.

### Statuses

| Record | From      | Action                               | To         |
| ------ | --------- | ------------------------------------ | ---------- |
| dApp   | (new)     | owner `POST /dapp`                   | `pending`  |
| dApp   | (new)     | owner `POST /dapp`, auto-approval on | `approved` |
| dApp   | `pending` | admin approve                        | `approved` |
| dApp   | `pending` | admin reject                         | `rejected` |

Any other action answers `INVALID_TRANSITION`.

### Auth0 failures

A failed Auth0 call never fails the request. The console records the error in the dApp's `auth0_error`, leaves the dApp pending, and alerts the admins. A later successful Auth0 write clears `auth0_error`.

## Auto-approval

Auto-approval is on when `AUTO_APPROVAL_ENABLED` is `true` and off otherwise. The console reads it at startup, so changing it needs a restart. While it is on, a new dApp gets its Auth0 client at once and is approved. If the Auth0 call fails, it stays pending.

## Provisioning

`AUTH0_PROVISIONER` picks the adapter behind the `AUTH0_PROVISIONER` token of `src/modules/provisioning/provisioning.tokens.ts`. `management` (`providers/auth0-management/`) calls the Management API through the `auth0` SDK with the M2M credentials. `fake` (`providers/fake/`) keeps clients in memory.

- Each client carries `client_metadata { console_dapp_id, managed_by: "console-<CONFIG_ENV>", logo_uri }`.
- Create copies the template client `AUTH0_TEMPLATE_CLIENT_ID`: `app_type spa`, `token_endpoint_auth_method none`, its grant types, OIDC conformance, JWT lifetime, algorithm and scopes, refresh token, cross-origin authentication and first-party flag. It adds the dApp's name, description, logo, callbacks, logout URLs and web origins, which are also the allowed origins. Create then sets the client's enabled connections to exactly the template's. A template without enabled connections fails the call.
- A 429 is retried once after `Retry-After`, capped at `AUTH0_MGMT_MAX_RETRY_AFTER_MS`, or after `AUTH0_MGMT_RETRY_AFTER_MS` without one. A 5xx is retried once after `AUTH0_MGMT_RETRY_AFTER_MS`, except on create. A 401, a 403 or a token-endpoint 4xx fails without a retry, and any other 4xx is a refusal. `AUTH0_MGMT_TIMEOUT_MS` bounds each request, body included.

## Notifications

The console notifies admins on Slack only, through `providers/slack/` behind the `SLACK_NOTIFIER` token of `src/modules/notification/notification.tokens.ts`. With `SLACK_WEBHOOK_URL` empty, no alert is sent.

Alerts go out on a new pending dApp, an auto-approved dApp, and a failed Auth0 call, an admin's approval included. Admin reviews send no other alert. Links point at `/admin/dapps/<id>` under `PUBLIC_URL`.

A Slack message carries the subject, the review link, the Auth0 error if any, and every field on one escaped line. Link unfurling is off. A Slack failure, including a non-2xx answer, is only logged.

## Metrics

`PrometheusModule` serves `/api/console/metrics` on `APP_PORT`, with the default labels `app=console` and `environment=<CONFIG_ENV>`:

- `console_transitions_total{action, result}` counts each use case, `create`, the Auth0 create of `autoApprove`, and the admin's `approve` and `reject`, with `result` one of `success`, the error code and `error`. An admin approval whose Auth0 call fails answers 200 and counts `success`. The alert and `auth0_error` record the failure.
- `console_dapps{status}` counts the dApps per status on each scrape.
- `console_auth0_request_duration_seconds{op, outcome}` times each Management API call.

## Code layout

- `src/modules/<module>/` holds one Nest module, named in the singular (`dapp`, `notification`, `provisioning`). Requests are in `requests/`, responses in `dtos/*.dto.ts` with static `from…` factories, and error codes in `error/`.
- An adapter lives in `src/modules/<module>/providers/<name>/`, its interface in `interfaces/`, and its injection token in `<module>.tokens.ts`.
- Unit tests are in `test/modules/`, mirroring `src/modules/`. Integration tests are in `test/integration/<module>/` and build their apps with `createTestApp` from `@backend/test`. Test data is in `test/mocks/`, and entity factories come from `@database/console/test/factories`.

## Running the Image

`docker/console.Dockerfile` builds on the base image and runs `dist/src/main.js`. Whoever runs it provides the environment from `.env.example`, a reachable Postgres (`DB_SSL=true` when it requires TLS), a TLS-terminating proxy in front of `APP_PORT`, health checks on `/api/console/livez` and `/api/console/readyz`, and a Prometheus scrape on `/api/console/metrics`, which the proxy keeps off the public host.

Nothing serializes the migrations of instances that start together, so when a release adds a migration, start one instance before the rest.
