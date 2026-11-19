# One secret per environment holding the console API's whole configuration:
# fast-auth/staging/console and fast-auth/prod/console (the module maps
# production to prod). The chart's SecretProviderClass reads it key by key, so
# every key the values file lists under console.secretProviderClass.secrets has
# to be present in the JSON or the pod never mounts it.
#
# The value itself is set out of band so it never lands in Terraform state:
#   aws secretsmanager put-secret-value --secret-id fast-auth/staging/console \
#     --secret-string file://console-staging.json
module "console_secret" {
  source = "git::ssh://git@github.com/Peersyst/peersyst-infra.git//tf-modules/secret?ref=main"

  project_name = var.project_name
  environment  = var.environment
  name         = "console"
  description  = "NEAR Auth Console API: Auth0 Management credentials, database connection, admin list and Slack webhook"
}

# fast-auth/staging/sandbox-broker: the broker's Auth0 client, AUTH0_CLIENT_ID and
# AUTH0_CLIENT_SECRET. Set out of band, like the console's. Staging only.
module "sandbox_broker_secret" {
  count  = var.environment == "staging" ? 1 : 0
  source = "git::ssh://git@github.com/Peersyst/peersyst-infra.git//tf-modules/secret?ref=main"

  project_name = var.project_name
  environment  = var.environment
  name         = "sandbox-broker"
  description  = "NEAR Auth sandbox broker: its Auth0 client id and secret"
}
