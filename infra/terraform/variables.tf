# Default AWS Tags Variables (Do NOT fill here. They are passed from the Makefile. Check README.md)
variable "region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Default environment [staging|production]"
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "environment must be staging or production."
  }
}

variable "project_name" {
  description = "Project name that needs to match the repository ej: fast-auth -> https://github.com/Peersyst/fast-auth"
  type        = string
  default     = "fast-auth"
}

variable "eks_cluster_name" {
  description = "Name of the EKS cluster the console runs on. The database derives its VPC, private subnets and security group from it."
  type        = string
  default     = "peersyst-dev"
}

variable "db_instance_class" {
  description = "Instance class of the production database."
  type        = string
  default     = "db.t4g.micro"
}

variable "db_allocated_storage" {
  description = "Initial storage of the production database, in GB."
  type        = number
  default     = 20
}
