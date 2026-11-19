# The public console host. Its zone is in this account, so the module validates it.
module "console_certificate" {
  count  = var.environment == "production" ? 1 : 0
  source = "git::ssh://git@github.com/Peersyst/peersyst-infra.git//tf-modules/acm?ref=main"

  domain_name          = "console.auth.near.org"
  validation_zone_name = "auth.near.org"
}

# The sandbox broker's host, on staging only.
module "sandbox_broker_certificate" {
  count  = var.environment == "staging" ? 1 : 0
  source = "git::ssh://git@github.com/Peersyst/peersyst-infra.git//tf-modules/acm?ref=main"

  domain_name          = "sandbox.auth.near.org"
  validation_zone_name = "auth.near.org"
}
