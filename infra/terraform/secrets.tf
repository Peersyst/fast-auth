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
