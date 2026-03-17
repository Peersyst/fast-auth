terraform {
  required_version = ">= 1.5"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {}
}

provider "aws" {
  region = var.aws_region
}

module "kms_signing_keys" {
  source = "./modules/kms-signing-keys"

  environment             = var.environment
  kms_key_deletion_window = var.kms_key_deletion_window
}

module "attester" {
  source = "./modules/attester"

  environment = var.environment
  aws_region  = var.aws_region

  zip_path      = var.attester_zip_path
  schedule      = var.attester_schedule
  timeout       = var.attester_timeout
  memory_size   = var.attester_memory_size
  secret_config = var.attester_secret_config

  kms_previous_alias_name = module.kms_signing_keys.signing_previous_alias_name
  kms_current_alias_name  = module.kms_signing_keys.signing_current_alias_name
  kms_next_alias_name     = module.kms_signing_keys.signing_next_alias_name
}

module "custom_issuer_rotation" {
  source = "./modules/custom-issuer-rotation"

  environment = var.environment

  zip_path    = var.rotation_zip_path
  schedule    = var.rotation_schedule
  timeout     = var.rotation_timeout
  memory_size = var.rotation_memory_size

  kms_alias_names = [
    module.kms_signing_keys.signing_previous_alias_name,
    module.kms_signing_keys.signing_current_alias_name,
    module.kms_signing_keys.signing_next_alias_name,
  ]
}
