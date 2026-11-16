# fast-auth infrastructure

Terraform for what the NEAR Auth Console needs outside the cluster: its Secrets
Manager secret and, in production, its Postgres database. The cluster side (the
API and the web app) is the Helm chart in `infra/chart`.

Modules come from the private repository
[`Peersyst/peersyst-infra`](https://github.com/Peersyst/peersyst-infra) under
`tf-modules/*`, pinned to `main` over `git::ssh://`, so `terraform init` needs
SSH access to it.

This replaced the stack that deployed the attester and rotation lambdas and
their KMS signing keys, destroyed in November 2026 along with the Sweat testnet
integration that was the only thing signing through them. Its state object,
`fast-auth/terraform.tfstate`, is still in the bucket and empty.

## Deploy / Destroy

Run from this directory:

```bash
make plan-staging
make plan-production

make deploy-staging
make deploy-production

make destroy-staging
make destroy-production
```

Each target selects its own workspace and backend key
(`fast-auth-console-<env>-tfState`), so staging and production live in
completely separate state files.

## What it creates

| File | Module | Resource |
| --- | --- | --- |
| `secrets.tf` | `peersyst-infra//tf-modules/secret` | Secret `fast-auth/<env>/console`. The module maps `production` to `prod`. |
| `rds.tf` | `peersyst-infra//tf-modules/rds` | **Production only.** Postgres `fast-auth-production-console`, its subnet group and its security group. Staging reuses the shared `peersyst-dev` instance. |
| `main.tf` | — | AWS provider, S3 backend, default tags. |

There is no IRSA here. The console reads no AWS API at runtime: its
configuration arrives as environment variables, which the Secrets Store CSI
driver mounts using the namespace's shared
`peersyst-secrets-iamserviceaccount`, the same one the relayer and the issuers
use. That service account's policy already covers `fast-auth/*`, so a new
secret under that prefix needs no IAM change.

## Variables

| Name | Default | Description |
| --- | --- | --- |
| `region` | `us-east-1` | AWS region. |
| `environment` | — | `staging` or `production`. Passed from the Makefile. |
| `project_name` | `fast-auth` | Project / repo name. First segment of the secret name. |
| `eks_cluster_name` | `peersyst-dev` | Cluster the console runs on. The database takes its VPC, private subnets and security group from it. |
| `db_instance_class` | `db.t4g.micro` | Production database instance class. |
| `db_allocated_storage` | `20` | Production database storage, in GB. |

## Steps Terraform does not do

### 1. The secret value

Terraform creates the secret, never its value: a value set here would sit in
the state file in plaintext. Every key the chart lists under
`console.secretProviderClass.secrets` has to be present, or the CSI driver
refuses to mount and the pod never starts.

```bash
cat > /tmp/console-staging.json <<'JSON'
{
  "AUTH0_LOGIN_DOMAIN": "login.testnet.fast-auth.com",
  "AUTH0_CONSOLE_CLIENT_ID": "",
  "AUTH0_MGMT_DOMAIN": "",
  "AUTH0_M2M_CLIENT_ID": "",
  "AUTH0_M2M_CLIENT_SECRET": "",
  "AUTH0_TEMPLATE_CLIENT_ID": "",
  "DB_HOST": "",
  "DB_DATABASE": "console",
  "DB_USER": "console",
  "DB_PASSWORD": "",
  "ADMIN_EMAILS": "someone@peersyst.com",
  "SLACK_WEBHOOK_URL": ""
}
JSON

aws secretsmanager put-secret-value \
  --secret-id fast-auth/staging/console \
  --secret-string file:///tmp/console-staging.json
```

`SLACK_WEBHOOK_URL` may be empty, which turns the Slack alerts off; the key
still has to exist. The settings that are not secret (`PUBLIC_URL`,
`AUTH0_PROVISIONER`, `AUTO_APPROVAL_ENABLED`, `DB_PORT`, `DB_SSL`) live in the
chart's values file instead, so a change to them is reviewed with the
deployment.

### 2. The staging database

Staging reuses the shared `peersyst-dev` Postgres, so its database and user are
created by hand, once, from the rds-bastion:

```sql
CREATE DATABASE console;
CREATE USER console WITH PASSWORD '<generated>';
GRANT ALL PRIVILEGES ON DATABASE console TO console;
\c console
GRANT ALL ON SCHEMA public TO console;
```

Then store the host, database, user and password in
`fast-auth/staging/console`. The API creates its own tables: it runs the TypeORM
migrations on startup.

### 3. The production database password

`tf-modules/rds` lets AWS create and keep the master password in its own
managed secret, so Terraform never sees it. After the first apply, read
`console_db_master_user_secret_arn` and copy the password into
`fast-auth/prod/console` as `DB_PASSWORD`, along with the `console_db_address`
as `DB_HOST` — or, better, create a dedicated role for the API and store that
one instead of the master.
