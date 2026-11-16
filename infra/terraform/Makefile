.PHONY: help \
	plan-staging plan-production \
	deploy-staging deploy-production \
	destroy-staging destroy-production

SHELL := bash
.DEFAULT_GOAL := help

PROJECT := fast-auth-console
TF      := terraform

# Every environment gets its own workspace and its own backend key, so staging
# and production never share a state file. The key names the stack, not just the
# project, so a second one can be added later without either owning the other's
# state. The retired lambda stack's own key, fast-auth/terraform.tfstate, is
# untouched and empty.
define tf_init
	$(TF) init -reconfigure -backend-config="key=$(PROJECT)-$(1)-tfState"
	$(TF) workspace new $(1) || true
	$(TF) workspace select $(1)
endef

help:
	@echo "Console infrastructure (Secrets Manager secret, production database)."
	@echo
	@echo "  make plan-staging        make plan-production"
	@echo "  make deploy-staging      make deploy-production"
	@echo "  make destroy-staging     make destroy-production"
	@echo
	@echo "Needs AWS credentials for 291847425310 and SSH access to Peersyst/peersyst-infra."

plan-staging:
	$(call tf_init,staging)
	$(TF) plan -var environment=staging
	rm -rf .terraform*

plan-production:
	$(call tf_init,production)
	$(TF) plan -var environment=production
	rm -rf .terraform*

deploy-staging:
	$(call tf_init,staging)
	$(TF) apply -var environment=staging
	rm -rf .terraform*

deploy-production:
	$(call tf_init,production)
	$(TF) apply -var environment=production
	rm -rf .terraform*

destroy-staging:
	$(call tf_init,staging)
	$(TF) destroy -var environment=staging
	rm -rf .terraform*

destroy-production:
	$(call tf_init,production)
	$(TF) destroy -var environment=production
	rm -rf .terraform*
