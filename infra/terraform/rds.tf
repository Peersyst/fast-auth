# Production-only Postgres. Staging reuses the shared peersyst-dev instance
# (its DB and user are created by hand, see README.md), so the module is gated
# on the environment instead of duplicating an instance for it.
#
# The master password is created and rotated by AWS into its own managed secret,
# which is why nothing here knows it: copy it into fast-auth/prod/console as
# DB_PASSWORD, or create a dedicated role for the console and store that one.
module "console_db" {
  count  = var.environment == "production" ? 1 : 0
  source = "git::ssh://git@github.com/Peersyst/peersyst-infra.git//tf-modules/rds?ref=main"

  project_name     = var.project_name
  environment      = var.environment
  eks_cluster_name = var.eks_cluster_name

  # fast-auth-production-console: the suffix leaves room for another fast-auth
  # database in the same environment.
  suffix = "console"

  engine            = "postgres"
  instance_class    = var.db_instance_class
  allocated_storage = var.db_allocated_storage

  db_name  = "console"
  username = "console"
}
