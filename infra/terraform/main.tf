# Infrastructure the NEAR Auth Console needs outside the cluster: its Secrets
# Manager secret and, in production, its database. On staging, also the sandbox
# broker's certificate.
#
# It follows the layout of Peersyst/peersyst-infra (see its AGENTS.md) and
# sources that repository's modules over SSH, so `terraform init` needs access
# to it. It is the only Terraform in this repository: the attester and rotation
# lambdas that used to live here went away with the Sweat testnet integration
# they served.
terraform {
  required_version = ">= 1.3"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
  backend "s3" {
    bucket         = "peersyst-terraform-state"
    region         = "us-east-1"
    encrypt        = "true"
    acl            = "bucket-owner-full-control"
    dynamodb_table = "peersyst-terraform-lock"
  }
}

provider "aws" {
  region = var.region
  default_tags {
    tags = {
      Region  = var.region
      Env     = var.environment
      Project = var.project_name
      Cluster = var.eks_cluster_name
    }
  }
}
