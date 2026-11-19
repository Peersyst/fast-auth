# Infrastructure

| Path | What it is |
| --- | --- |
| `chart/` | The Helm chart deployed to the `fast-auth` namespace of `peersyst-privatenet`, one release per environment (`staging`, `production`). One template per component, one values file per environment. |
| `terraform/` | The console's AWS side: its Secrets Manager secret and its production database. Follows the conventions in `Peersyst/peersyst-infra`. |

The pipelines are in `.github/workflows`: `build-and-deploy.yaml` builds every
image on a push to `main` and deploys staging, and `manual-deploy.yml` deploys
a chosen set of tags to a chosen environment.

## Bringing the console up

The console is two components on one host, which serves the web app at `/` and
the API under `/api/console`, so the app calls its API on its own origin.
Staging answers on `console-staging.aws.peersyst.tech`. Production answers on
`console.auth.near.org`, and on `console-production.aws.peersyst.tech` until
that public host resolves.

The steps below are for staging and have to run in this order: the chart will
not start the API until its secret holds every key, and the deployment is
`--atomic`, so an API that never turns ready rolls the whole release back.

You need AWS credentials for account `291847425310`, SSH access to
`Peersyst/peersyst-infra` (Terraform sources its modules from there), and the
`peersyst-privatenet` kubectl context.

### 1. Create the AWS side

```bash
make -C infra/terraform plan-staging
```

```bash
make -C infra/terraform deploy-staging
```

This creates the secret `fast-auth/staging/console`, empty. Terraform never
holds its value: a value set there would sit in the state file in plaintext.

### 2. Create the database

Staging reuses the shared `peersyst-dev` Postgres, so its database and user are
created by hand, once. Find the instance:

```bash
aws rds describe-db-instances --query 'DBInstances[].[DBInstanceIdentifier,Endpoint.Address]' --output table
```

Reach it through the rds-bastion, whose security group the instance already
accepts, and run:

```sql
CREATE DATABASE console;
CREATE USER console WITH PASSWORD '<generated>';
GRANT ALL PRIVILEGES ON DATABASE console TO console;
\c console
GRANT ALL ON SCHEMA public TO console;
-- Still as the master user: on RDS the app's own role may not create
-- extensions, and the first migration needs both of these.
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS citext;
```

The API creates its own **tables**: `migrationsRun` is on, so it applies the
pending TypeORM migrations on startup. It does not create the database, the
role or the extensions. It opens a connection to a database that has to be
there already, and TypeORM only *warns* when it cannot install an extension
itself — after which the first migration fails creating a column that defaults
to `uuid_generate_v4()`.

### 3. Set Auth0 up

In the tenant the environment's users sign in on (testnet for staging), three
applications:

- **The console's own SPA application.** Its allowed callback URLs, logout URLs
  and web origins include `https://console-staging.aws.peersyst.tech`, plus
  `http://localhost:3001` if you want to run the web app locally against it.
  Its client ID is both the API's `AUTH0_CONSOLE_CLIENT_ID` and the bundle's
  `CONSOLE_WEB_AUTH0_CLIENT_ID`.
- **A machine-to-machine application**, authorized for the Management API with
  exactly the scopes the console uses: `read:clients`, `create:clients`,
  `update:clients`, `read:connections`, `update:connections`,
  `read:client_grants` and `create:client_grants`. It provisions
  no client secrets, so it needs no `read:client_keys`. Its credentials are
  `AUTH0_M2M_CLIENT_ID` and `AUTH0_M2M_CLIENT_SECRET`. The console caches the
  M2M token until it expires, so restart it after changing a grant or a scope.
- **A template application**, `AUTH0_TEMPLATE_CLIENT_ID`. Every client the
  console provisions for a dApp is created from this one's settings, its
  enabled connections and its user grants. It must have at least one connection
  enabled, or provisioning fails with
  `The template client ... has no enabled connections`. It must also have a
  user grant on the signing API with `transaction:sign`:
  `auth0.jwt.fast-auth.testnet` in staging, `auth0.jwt.fast-auth.near` in
  production. The console copies the user grants it finds without checking
  their audiences or scopes. It only refuses a template that has none, with
  `The template client ... has no user grants`.

`AUTH0_MGMT_DOMAIN` is the tenant's own domain (`<tenant>.<region>.auth0.com`),
which is not the same as `AUTH0_LOGIN_DOMAIN`, the custom domain users sign in
on.

### 4. Fill the secret

Every key below has to be present: the chart's SecretProviderClass pulls them
one by one, and a missing one means the volume never mounts and the pod never
starts. `SLACK_WEBHOOK_URL` may be an empty string, which turns the Slack
alerts off.

```bash
cat > /tmp/console-staging.json <<'JSON'
{
  "AUTH0_LOGIN_DOMAIN": "login.testnet.fast-auth.com",
  "AUTH0_CONSOLE_CLIENT_ID": "<the SPA application>",
  "AUTH0_MGMT_DOMAIN": "<tenant>.<region>.auth0.com",
  "AUTH0_M2M_CLIENT_ID": "<the M2M application>",
  "AUTH0_M2M_CLIENT_SECRET": "<its secret>",
  "AUTH0_TEMPLATE_CLIENT_ID": "<the template application>",
  "DB_HOST": "<the shared instance's endpoint>",
  "DB_DATABASE": "console",
  "DB_USER": "console",
  "DB_PASSWORD": "<the one from step 2>",
  "ADMIN_EMAILS": "someone@peersyst.com,other@peersyst.com",
  "SLACK_WEBHOOK_URL": ""
}
JSON
```

```bash
aws secretsmanager put-secret-value --secret-id fast-auth/staging/console --secret-string file:///tmp/console-staging.json
```

The settings that are not secret live in `chart/values/staging.yaml` instead,
under `console.env`: `PUBLIC_URL`, `AUTH0_PROVISIONER`, `AUTO_APPROVAL_ENABLED`,
`DB_PORT` and `DB_SSL`. An admin is an address in `ADMIN_EMAILS` **and** has a
verified email in Auth0.

### 5. Set the GitHub variables

Vite bakes the web app's settings into the bundle, so the image is built once
per environment from that environment's variables. In Settings → Environments →
`staging`:

| Variable | Value |
| --- | --- |
| `CONSOLE_WEB_BACKEND_URL` | Empty: the app and the API share a host, whichever one the browser came in on. |
| `CONSOLE_WEB_AUTH0_LOGIN_DOMAIN` | `login.testnet.fast-auth.com` |
| `CONSOLE_WEB_AUTH0_CLIENT_ID` | The SPA application from step 3. |
| `CONSOLE_WEB_NEAR_NETWORK` | `testnet` |

The environment may not require reviewers or restrict deployment branches, or
the image build waits for an approval that never comes.

### 6. The images

CI builds them on every push to `main`, from `base`:

- `ghcr.io/peersyst/fast-auth-console:<commit>` — the API, same tag shape as
  the other services.
- `ghcr.io/peersyst/fast-auth-console-web:<commit>-staging` and
  `-production` — one per environment, because of step 5.

To check a build locally, without pushing anything:

```bash
docker build -f docker/base.Dockerfile -t fast-auth-base:local .
```

```bash
docker build -f docker/console.Dockerfile --build-arg BASE_IMAGE=fast-auth-base:local -t fast-auth-console:local .
```

```bash
docker build -f docker/console-web.Dockerfile --build-arg BASE_IMAGE=fast-auth-base:local --build-arg BACKEND_URL= --build-arg AUTH0_LOGIN_DOMAIN=login.testnet.fast-auth.com --build-arg AUTH0_CLIENT_ID=<the SPA application> --build-arg NEAR_NETWORK=testnet -t fast-auth-console-web:local .
```

### 7. Turn it on and deploy

With steps 1 to 5 done, flip both flags in `chart/values/staging.yaml`:

```yaml
console:
    enabled: true
consoleWeb:
    enabled: true
```

A push to `main` then builds the images and deploys staging on its own. Any
other environment goes through `manual-deploy.yml`, which takes a tag per
component.

### 8. Check it

```bash
kubectl -n fast-auth rollout status deploy/console-staging
```

```bash
kubectl -n fast-auth logs deploy/console-staging --tail=50
```

```bash
curl -s https://console-staging.aws.peersyst.tech/api/console/livez
```

The host has to resolve to the shared ALB and be covered by a certificate in
`ingress.certificate`. `*.aws.peersyst.tech` is; if the record does not appear
once the ingress is applied, it has to be created by hand, the way
`fast-auth-staging.aws.peersyst.tech` is. `/api/console/metrics` answers `403`
from outside on purpose — Prometheus scrapes the pod directly.

## Production

Same steps, with four differences:

1. `make -C infra/terraform deploy-production` also creates the database,
   `fast-auth-production-console`. Read its address from the `console_db_address`
   output and its master password from the AWS-managed secret named by
   `console_db_master_user_secret_arn`, then put both in
   `fast-auth/prod/console` — or create a role for the API and store that one.
2. Auth0 is the mainnet tenant, and `CONSOLE_WEB_NEAR_NETWORK` is `mainnet`.
3. `console.auth.near.org` needs a record in the `near.org` zone, which is
   served by Namecheap rather than this account's Route 53, and an ACM
   certificate of its own: the one behind `auth.near.org` names that host alone,
   with no wildcard. Add the new certificate's ARN to `ingress.certificate` in
   `chart/values/production.yaml`.
4. Production is deployed only through `manual-deploy.yml`, which has no
   `landing-tag` input while the landing is enabled in production. Deploying it
   as it stands leaves that image without a tag and the release fails.
