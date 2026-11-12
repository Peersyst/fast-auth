# Console

NestJS service for the NEAR Auth Console. A dApp team submits its app, an admin reviews it unless auto-approval approves it, and the console creates the team's Auth0 client. It is configured only by environment variables and serves its routes under `/api/console`.

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
| `AUTO_APPROVAL_ENABLED`                                                                                  | Approves new owners' first dApps. Read at startup, so a change needs a restart            | `false`                                                     |
| `SLACK_WEBHOOK_URL`, `SLACK_TIMEOUT_MS`                                                                  | Slack incoming webhook (`https://hooks.slack.com/...`) for admin alerts, and its deadline | none (Slack off), `5000`                                    |

The config namespaces live in `src/config/*.config.ts`. The Management API settings are `auth0.management`, `null` when the adapter is `fake`. The generic validators come from `@backend/config`.

## Identity

The console identifies a person by the email in their Auth0 ID token. dApp ownership and admin rights both require Auth0's `email_verified` claim to be true, so the tenant must enable only connections that verify email addresses.

## HTTP API

Every route is under `/api/console`. CORS allows only `PUBLIC_URL`, the web app's origin, which calls the API from its own host. `express-openapi-validator` checks each request against `openapi-spec.json`, and a global `ValidationPipe` with `whitelist`, `forbidNonWhitelisted` and `transform` checks each body and query against its request class.

### Errors

A business error answers `{ statusCode, message }`, where `message` is one of the codes below. The codes are in each module's `error/` folder, merged in `src/modules/common/exception/error-codes.ts`. `ErrorFilter` from `@backend/core` answers an OpenAPI validator refusal with its status and message. Any other error, such as a `ValidationPipe` refusal or an unexpected failure, gets Nest's default answer.

| Code                     | Status | When                                                                                                |
| ------------------------ | ------ | --------------------------------------------------------------------------------------------------- |
| `UNAUTHENTICATED`        | 401    | No token, another scheme than `Bearer`, or a token that fails verification or the claim checks      |
| `EMAIL_REQUIRED`         | 403    | The token has no email claim                                                                        |
| `EMAIL_NOT_VERIFIED`     | 403    | The route needs a verified email and `email_verified` is not true                                   |
| `FORBIDDEN_ROLE`         | 403    | An admin route and a caller who is not an admin                                                     |
| `DAPP_NOT_FOUND`         | 404    | No such dApp, or the caller has no live dApp                                                        |
| `DAPP_ALREADY_EXISTS`    | 409    | The email already owns a live dApp, including a race on the live-owner unique index                 |
| `INVALID_TRANSITION`     | 409    | The dApp's status does not allow the action                                                         |
| `NO_PENDING_CHANGE`      | 409    | A change action on a dApp without a pending change                                                  |
| `DAPP_CHANGED`           | 409    | A stale `expectedVersion`, an `:id` that is not the caller's live dApp, or a lock timeout (`55P03`) |
| `PROVISIONING_REJECTED`  | 422    | Auth0 refused the call, or a client's tags belong to another dApp                                   |
| `PROVISIONING_FAILED`    | 502    | A transient Auth0 failure                                                                           |

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

### Owner routes

All under `Authenticated()`.

| Route                               | Answer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /dapp`                         | 200 `{ dapp: OwnerDapp \| null }`, the caller's live (not removed) dApp, matched by email case-insensitively.                                                                                                                                                                                                                                                                                                                                                                                 |
| `POST /dapp`                        | Body `UpsertDappRequest`. 201 `OwnerDapp` with status `pending`, or `approved` when auto-approval approved it. 409 `DAPP_ALREADY_EXISTS` when the email already owns a live dApp.                                                                                                                                                                                                                                                                                                             |
| `PUT /dapp/:id`                     | Body `UpsertDappRequest` plus `expectedVersion`. A pending dApp is edited in place. A rejected dApp is edited and resubmitted: back to pending, with the review fields and Auth0 error cleared and `submittedAt` reset. On an approved dApp, every change becomes a pending change for review, and the live fields stay as they are until an admin approves it. That change is withdrawn when the fields match the live values again, and replaced when they differ from it. 200 `OwnerDapp`. |
| `DELETE /dapp/:id?expectedVersion=` | Removes the live dApp and deletes its Auth0 client, found by tag when the dApp has no client id. 204.                                                                                                                                                                                                                                                                                                                                                                                         |

`OwnerDapp` is `{ id, name, description, logoUrl, mauBracket, callbackUrls, logoutUrls, webOrigins, contactEmail, status, pendingChange, pendingChangeAt, auth0ClientId, version, submittedAt }`. `pendingChange` holds every proposed field or `null`, and dates are ISO strings.

`UpsertDappRequest` fields follow the rules in `@shared/modules/dapp`:

- `name` is trimmed, 1 to 64 UTF-16 units, with no `<`, `>` or control characters.
- `description` is trimmed, at most 140 units, with no control characters but tab and line breaks.
- `logoUrl` is a public `https:` URL of at most 255 characters.
- `mauBracket` is one of `lt1k`, `1k_10k`, `10k_25k` and `gt25k`.
- `callbackUrls` holds 1 to 10 URLs, `logoutUrls` 0 to 10, and `webOrigins` 1 to 10. Each entry is trimmed, its scheme and authority lowercased, and the list de-duplicated. Each must be an `https:` URL on a DNS name with a top-level domain: no IP address, no single-label host, no credentials, no fragment on a URL, and nothing after the port on an origin.
- `contactEmail` is a plain address with a dotted domain, at most 254 characters.
- No text may contain NUL. The admin `search` is at most 100 characters.

### Admin routes

All under `AdminAuthenticated()`. Each write takes `expectedVersion` in its body, and answers 200 `AdminDapp`.

| Route                                  | Answer                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /admin/dapps`                     | Query `needsReview` (pending, or approved with a pending change), `status`, `search`, `page` (1 to 10000, default 1), `pageSize` (1 to 100, default 20), `orderBy` (`submittedAt`, `updatedAt`, `name` or `status`) and `order` (`ASC`, the default, or `DESC`). `search` matches a case-insensitive substring of the name, owner email, contact email or client id, with LIKE wildcards taken literally. Without `orderBy`, the review queue sorts by time waiting (pending change time, else submission) and other lists by submission. The id breaks ties. 200 `{ items, totalItems, currentPage, pages }`, the `Paginated` shape of `@backend/core/pagination`. |
| `GET /admin/dapps/:id`                 | 200 `AdminDapp`, in any status.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `PUT /admin/dapps/:id`                 | Body `UpsertDappRequest` plus `expectedVersion`. Syncs an approved dApp's Auth0 client when a synced field changed or the last sync failed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `POST /admin/dapps/:id/approve`        | Pending only. Reuses a client tagged with the dApp or creates one, then approves.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| `POST /admin/dapps/:id/reject`         | Deletes any client tagged with the dApp.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| `POST /admin/dapps/:id/change/approve` | Applies the pending change to the fields, and to Auth0 when a synced field changes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `POST /admin/dapps/:id/change/reject`  | Drops the change and resyncs Auth0 to the live fields.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| `POST /admin/dapps/:id/remove`         | Deletes the client.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| `GET /admin/dapps/:id/events`          | 200 the events newest first, each `{ id, type, actorRole, details, createdAt }`. 404 `DAPP_NOT_FOUND` for an unknown dApp.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

`AdminDapp` is `OwnerDapp` plus `{ ownerEmail, reviewedAt, auth0Error, removedAt, createdAt, updatedAt }`.

## dApp writes

`src/modules/dapp/dapp-write.service.ts` runs every owner and admin use case in one transaction. It locks the dApp row `FOR UPDATE`, compares `expectedVersion`, calls Auth0 and appends the events. Each action checks the status it allows after the lock. The edit classification and the field diffs are pure functions in `@shared/modules/dapp`.

| Status     | Allowed actions                                                                                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pending`  | `edit` and `adminEdit` stay pending. `approve` leads to approved, `reject` to rejected, and `remove` to removed.                                                                                                          |
| `approved` | `edit`, `approveChange` and `rejectChange` stay approved. `adminEdit` is refused while a change is pending. The change actions need a pending change, else `NO_PENDING_CHANGE`. `remove` leads to removed.                |
| `rejected` | `edit` leads to pending. `adminEdit` stays rejected. `remove` leads to removed.                                                                                                                                           |
| `removed`  | None.                                                                                                                                                                                                                     |

A failed Auth0 call rolls the action back to a savepoint. The console then records `auth0_error` on the dApp without bumping its version and appends `auth0_failed { op, error, clientId? }`. A transient failure answers 502 `PROVISIONING_FAILED`, and a refusal or a tag mismatch answers 422 `PROVISIONING_REJECTED`. A delete that finds the client tagged for another dApp goes on and records the mismatch as the Auth0 error.

`dapp_event` rows are append-only. Each has an actor role, `user` for the owner, `admin` or `system`, and one of these types:

- `submitted { chosenForAutoApproval }`, `edited { changes }`, `resubmitted`, `approved`, `auto_approved` and `rejected`.
- `change_requested { changes }`, `change_withdrawn`, `change_approved { changes }` and `change_rejected`.
- `removed`.
- `auth0_created { clientId, payload }`, `auth0_updated { clientId, payload }`, `auth0_deleted { clientId }` and `auth0_failed`.

A change lists `{ field, before, after }`, except for the contact email, which records only `{ field }`.

## Auto-approval

Auto-approval is on when `AUTO_APPROVAL_ENABLED` is `true` and off otherwise. The console reads it at startup, so changing it needs a restart. While it is on, a new submission is approved at once when its owner's email never had a dApp. The admins then get an `auto_approved` alert on Slack. If the Auth0 calls fail, the dApp stays pending for an admin and the admins get the usual submission alert. Edits, resubmissions and change requests always go to an admin.

## Provisioning

`AUTH0_PROVISIONER` picks the adapter behind the `AUTH0_PROVISIONER` token of `src/modules/provisioning/provisioning.tokens.ts`. `management` (`providers/auth0-management/`) calls the Management API through the `auth0` SDK with the M2M credentials. `fake` (`providers/fake/`) keeps clients in memory.

- Each client carries `client_metadata { console_dapp_id, managed_by: "console-<CONFIG_ENV>", logo_uri }`. Update and delete check the tags first, and a mismatch is a `tag_mismatch`.
- Create copies the template client `AUTH0_TEMPLATE_CLIENT_ID`: `app_type spa`, `token_endpoint_auth_method none`, its grant types, OIDC conformance, JWT lifetime, algorithm and scopes, refresh token, cross-origin authentication and first-party flag. It adds the dApp's name, description, logo, callbacks, logout URLs and web origins, which are also the allowed origins. Create and update then set the client's enabled connections to exactly the template's. A template without enabled connections fails the call.
- Find and list page through every client, 100 at a time, and keep the ones tagged for this environment.
- A 404 on delete counts as deleted.
- A 429 is retried once after `Retry-After`, capped at `AUTH0_MGMT_MAX_RETRY_AFTER_MS`, or after `AUTH0_MGMT_RETRY_AFTER_MS` without one. A 5xx is retried once after `AUTH0_MGMT_RETRY_AFTER_MS`, except on create. A 401, a 403 or a token-endpoint 4xx fails without a retry, and any other 4xx is a refusal. `AUTH0_MGMT_TIMEOUT_MS` bounds each request, body included.

## Notifications

The console notifies admins on Slack only, through `providers/slack/` behind the `SLACK_NOTIFIER` token of `src/modules/notification/notification.tokens.ts`. With `SLACK_WEBHOOK_URL` empty, no alert is sent.

Alerts go out on a submission, an auto-approval, a resubmission and a change request. Admin actions, owner removals and in-place edits of a pending dApp send none. Links point at `/admin/dapps/<id>` under `PUBLIC_URL`.

A Slack message carries the subject, the review link and every field on one escaped line, marks the changed fields of a resubmission with their old value, and turns link unfurling off. A Slack failure, including a non-2xx answer, is only logged.

## Metrics

`PrometheusModule` serves `/api/console/metrics` on `APP_PORT`, with the default labels `app=console` and `environment=<CONFIG_ENV>`:

- `console_transitions_total{action, result}` counts each use case, with `result` one of `success`, the error code and `error`.
- `console_dapps{status}` counts the dApps per status on each scrape.
- `console_auth0_request_duration_seconds{op, outcome}` times each Management API call.

## Code layout

- `src/modules/<module>/` holds one Nest module, named in the singular (`dapp`, `setting`, `notification`, `provisioning`). Requests are in `requests/`, responses in `dtos/*.dto.ts` with static `from…` factories, and error codes in `error/`.
- An adapter lives in `src/modules/<module>/providers/<name>/`, its interface in `interfaces/`, and its injection token in `<module>.tokens.ts`.
- Unit tests are in `test/modules/`, mirroring `src/modules/`. Integration tests are in `test/integration/<module>/` and build their apps with `createTestApp` from `@backend/test`. Test data is in `test/mocks/`, and entity factories come from `@database/console/test/factories`.

## Running the Image

`docker/console.Dockerfile` builds on the base image and runs `dist/src/main.js`. Whoever runs it provides the environment from `.env.example`, a reachable Postgres (`DB_SSL=true` when it requires TLS), a TLS-terminating proxy in front of `APP_PORT`, health checks on `/api/console/livez` and `/api/console/readyz`, and a Prometheus scrape on `/api/console/metrics`, which the proxy keeps off the public host.

Nothing serializes the migrations of instances that start together, so when a release adds a migration, start one instance before the rest.
