# NEAR Auth Console

Self-service dApp registration for NEAR Auth. A dApp team submits its app, an admin reviews it unless auto-approval approves it, and the console creates the team's Auth0 client and emails them the result.

`apps/console` is a NestJS API that also serves its own React SPA from `web/`, configured only by environment variables.

The SPA is built for ES2022, so it needs Safari 16.4, Chrome 94, Firefox 93 or Edge 94, or newer.

## Run it locally

1. Start Postgres with `docker compose up -d`. The first start also creates `console_e2e` for the e2e tests.
2. Copy `.env.example` to `.env`, fill in `AUTH0_CONSOLE_CLIENT_ID` and your email in `ADMIN_EMAILS`, and export it with `set -a; . ./.env; set +a`.
3. Run `pnpm start`. The API migrates the database, then listens on `APP_PORT` under `/api/console`, with Swagger UI at `/api/console/docs`.
4. To add one dApp in each status, run `pnpm seed` once the API has migrated the database. The seed refuses to run unless `CONFIG_ENV` is `development` or `test`, both adapters are `fake`, `SLACK_WEBHOOK_URL` is empty and auto-approval is off. A rerun skips the owners that already have a dApp.
5. Run `pnpm --filter console-web dev` for the SPA with hot reload. It proxies `/api/console` to port 3000.

## Checks

| Command                                                          | What it checks                                                                                                             |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`, `pnpm check-types`                                  | ESLint and TypeScript                                                                                                      |
| `pnpm test`                                                      | Unit tests. CI runs `pnpm test -- --coverage`, which needs 100% coverage in `src/domain`.                                  |
| `pnpm test:e2e`                                                  | The API against `console_e2e`, with the fake Auth0 and email adapters. Needs Postgres. The suite loads `.env.test` itself. |
| `pnpm spec`                                                      | Rewrites `openapi-spec.json`. Needs Postgres. CI fails if the committed file differs.                                      |
| `pnpm migration:check`                                           | Fails if the entities differ from the migrations. Rebuilds `console_e2e`. Needs Postgres.                                  |
| `pnpm --filter console-web lint`, `check-types`, `test`, `build` | The SPA in `web/`: ESLint, TypeScript, Vitest and the Vite build.                                                          |

`pnpm test:e2e` and `pnpm migration:check` both drop and rebuild `console_e2e`, so run only one of them at a time against the same Postgres.

## Configuration

Every key is listed in `.env.example`. The app parses them once at startup and exits naming every missing or malformed key. `CONFIG_ENV=production` refuses the fake Auth0 provisioner and the fake emailer.

## Identity

The console identifies a person by the email in their Auth0 ID token. dApp ownership and admin rights both require Auth0's `email_verified` claim to be true. The Auth0 tenant must enable only connections that verify email addresses, because a connection that asserts `email_verified: true` for an address it never checked would grant that address's ownership and admin rights.

## Auto-approval

Auto-approval is off by default. An admin reads it with `GET /api/console/admin/settings` and turns it on or off with `PUT /api/console/admin/settings` and the body `{ "autoApproval": { "enabled": true } }`. The `setting_events` table records each change with the old value, the new value, and the admin's email.

While it is on, the console chooses a new submission for auto-approval when both of these hold:

-   The owner's email has no earlier dApp, whatever its status. An owner whose dApp was rejected or removed always goes to an admin.
-   Fewer than 10 submissions were chosen in the last 24 hours. The window is rolling, and the cap is `AUTO_APPROVAL_DAILY_CAP` in `src/domain/dapp.ts`.

For a chosen submission, the console creates the Auth0 client at once and `POST /api/console/dapp` answers 201 with status `approved`. The owner gets the approval email, and the admins get an `auto_approved` email and Slack alert. If the Auth0 call fails, or an admin turns auto-approval off before the console starts the Auth0 calls, the dApp stays `pending` and the admins get the usual submission alert. Turning it off after the calls start does not stop that approval. The choice still counts against the cap.

Turning it on does not approve dApps that are already pending. Edits, resubmissions of rejected dApps, and change requests always go to an admin.

## Operations

Run the scripts from a build. In `apps/console`, run `pnpm --filter console-web build` and then `pnpm build`, since the API build copies the SPA from `web/dist`. Export the environment of the deployment you target, then start the script with `node`.

### Find orphan and missing Auth0 clients

`node dist/scripts/reconcile.js` compares the Auth0 clients tagged `console-<CONFIG_ENV>` with the dApps in the database, and lists:

-   Tagged clients that no approved dApp uses. These are clients of removed, pending or rejected dApps, clients whose dApp is not in the database, clients with no `console_dapp_id` tag, and a second client of an approved dApp. A crash between the Auth0 create and the approval commit leaves such a client on a pending dApp.
-   Approved dApps whose client is missing.

The script changes nothing, and it does not compare a client's callbacks, web origins or name with its dApp. It exits with 0 when it lists nothing, 1 when it lists something, and 2 when it fails. Approving a pending dApp adopts its listed client, and rejecting or removing the dApp deletes it. Delete any other listed client in Auth0 by hand once nobody uses it.

### Erase a person's data

`node dist/scripts/anonymise.js <dappId>` erases the personal data of one removed dApp. It refuses a dApp in any other status. It writes `erased` over:

-   `owner_email`, `contact_email`, `reviewed_by` and `removed_by` on the dApp, and `actor_email` on its events.
-   Every email address in `name`, `description`, `rejection_reason`, `removal_reason`, `auth0_error` and the events' `details`.

A run erases every person on the dApp, not only the one who asked. That covers the owner, the contact, the reviewer, the remover and every actor in its events.

Every erased value is the same word, so erased rows cannot be linked to each other or to an address. A person whose every dApp was erased counts as a new owner for auto-approval.

The script keeps the name, description, logo URL, callback URLs, logout URLs and web origins. These are the dApp's business data, not personal data, though an email address typed into the name or description is erased too. It also keeps every row, so the dApp's history stays whole. It does not recognise a person's name typed into a reason. Read the reasons, and edit any that name someone by hand.

A rerun changes nothing, unless an email address reached the rows after the last run. The rerun then erases that address too.

One run covers one dApp, but a person can own several removed dApps over time, and can act on other dApps as an admin or a past owner. To list every dApp a person appears in, run this query with their address in place of `alice@example.com`:

```sql
SELECT DISTINCT d.id, d.status
FROM dapps d LEFT JOIN dapp_events e ON e.dapp_id = d.id
WHERE concat_ws(' ', d.name, d.description, d.owner_email, d.contact_email, d.reviewed_by, d.removed_by, d.rejection_reason,
                d.removal_reason, d.auth0_error, e.actor_email, e.details) ILIKE '%alice@example.com%';
```

The query matches any text that contains the address, so `alice@example.com` also lists `malice@example.com`, and `_` in the address matches any one character. Check each row before you run the script.

Run the script once for each removed dApp in the list that the person owned. Where they did not own the dApp (they were its contact, reviewed or removed it, or are named in its text), replace their address in its rows with `erased` by hand instead, because a run would erase everyone else on that dApp too. The script cannot erase a person from a dApp that is still live. If the person owns a live dApp, remove it first with `POST /api/console/admin/dapps/{id}/remove`. The `setting_events` table also keeps the email of each admin who changed a setting, and the script does not touch it.

### Add or remove an admin

Change `ADMIN_EMAILS` and restart. An admin also needs a verified email.
