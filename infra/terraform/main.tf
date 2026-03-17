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

module "custom_issuer_lambdas" {
  source = "./modules/custom-issuer-lambdas"

  environment = var.environment
  aws_region  = var.aws_region

  # KMS
  kms_key_deletion_window = var.kms_key_deletion_window

  # Attester
  attester_zip_path      = var.attester_zip_path
  attester_schedule      = var.attester_schedule
  attester_timeout       = var.attester_timeout
  attester_memory_size   = var.attester_memory_size
  attester_secret_config = var.attester_secret_config

  # Rotation
  rotation_zip_path    = var.rotation_zip_path
  rotation_schedule    = var.rotation_schedule
  rotation_timeout     = var.rotation_timeout
  rotation_memory_size = var.rotation_memory_size
}
